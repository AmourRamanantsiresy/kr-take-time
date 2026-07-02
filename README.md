# Cybera — Cyber-Café Captive-Portal Access Manager

Turns a single Debian PC into an internet-access gateway for a cyber café.
Customers authenticate through a captive portal, get **time** (never data
caps) via admin approval or prepaid vouchers, and are automatically cut off
when their balance runs out.

```
Starlink → [USB3 = WAN] Debian PC [onboard NIC = LAN] → router (AP/bridge) → users
```

**Stack:** nftables (NAT/firewall) · dnsmasq (DHCP/DNS) · OpenNDS (captive
portal + time enforcement) · PostgreSQL · NestJS backend (also the OpenNDS
FAS) · React + Vite + MUI frontend · Caddy (reverse proxy) · systemd.

---

## Hardware / OS prerequisites

- **OS:** Debian 13 "Trixie" server (no desktop), systemd.
- **One PC** — gateway, app, and DB all run on this box.
- **Onboard NIC = LAN** (faces the router/users).
  **USB3 Ethernet adapter = WAN** (faces Starlink).
- **USB adapter guidance:** use a **USB3** adapter with an
  **RTL8153 or AX88179** chipset, plugged **directly into a USB3 port —
  no hub**. The installer disables USB autosuspend for it via a udev rule
  (`/etc/udev/rules.d/90-cybera-usb-wan.rules`); if you still see the
  adapter sleeping, add `usbcore.autosuspend=-1` to the kernel command
  line in `/etc/default/grub` and run `update-grub`.
- The local router must run in **AP/bridge mode** — the Debian PC is the
  only DHCP/DNS/gateway on the LAN.

### Which interface is which?

Run `ip -o link`. The onboard NIC is usually `enp…`/`eth0`; the USB adapter
usually shows up as `enx<mac>`. Interface names go in `.env` and are
**never hardcoded** — the same repo works across machines and reinstalls.

---

## Install

> **⚠️ First install needs the box online.** The installer pulls apt
> packages and npm dependencies from the internet *before* it reconfigures
> the NICs for gateway duty. Plug the box into any working network (e.g.
> the Starlink router in its default mode) for the install, then cable it
> into its final WAN/LAN topology afterwards.

```bash
git clone <repo>
cd <repo>
cp .env.example .env      # edit interface names + passwords + secrets
sudo ./install.sh
```

`install.sh` is idempotent — re-run it after changing `.env` or pulling
updates. It:

1. Verifies Debian 13 + root, prints detected interfaces for confirmation.
2. Installs apt packages (nftables, dnsmasq, opennds, postgresql, caddy)
   and Node.js 22 LTS.
3. Creates the Postgres role + DB, runs SQL migrations, seeds the admin.
4. Renders all config templates from `.env`
   (nftables, dnsmasq, OpenNDS incl. FAS key/URL, Caddyfile, systemd units).
5. Installs the udev rule that disables USB autosuspend on the WAN adapter.
6. Installs a **scoped sudoers entry**: the `cybera` service user may run
   `ndsctl` and nothing else. The app never runs as root.
7. Builds backend + frontend, installs and enables systemd units
   (`cybera-backend`, `cybera-session-manager`) and enables
   opennds/dnsmasq/nftables so **everything survives a reboot**.
8. Prints the portal URL and admin login.

To remove: `sudo ./uninstall.sh` (add `--drop-db` to also destroy the DB).

---

## How it works — the FAS / time-enforcement loop

1. A device joins the Wi-Fi; dnsmasq hands it an IP with this box as
   gateway + DNS.
2. OpenNDS intercepts the unauthenticated client and redirects its browser
   to the **FAS**: `GET /fas?fas=<base64 blob>` on the backend (through
   Caddy). The blob carries `clientip`, `clientmac`, `hid`, etc.
   (`fas_secure_enabled 1`).
3. The backend decodes the blob and **re-signs the client context with the
   shared `FAS_KEY` (HMAC-SHA256)**, then bounces the browser into the SPA
   with `clientip/clientmac/hid/sig` in the query string. The SPA stashes
   it in localStorage so it survives login/registration.
4. The customer logs in, gets time (voucher redeem = instant; plan request
   = admin approval; both credit `users.remaining_seconds`), and taps
   **Connect this device**.
5. `POST /session/connect` verifies the HMAC signature (only contexts that
   genuinely came through OpenNDS can pass), checks balance > 0 and the
   concurrent-device count against `device_limit`, records the session,
   and runs `sudo ndsctl auth <mac> <timeout>` with
   `timeout = min(remaining_seconds, MAX_SESSION_SECONDS)`.
6. **OpenNDS enforces the countdown** and auto-deauthenticates the client
   when its session timeout elapses — even if the backend were down.
7. The **session-manager** (own systemd unit) reconciles every
   `SESSION_TICK_SECONDS`: it polls `ndsctl json`, settles wall-clock
   seconds against each owner's shared balance, updates
   `sessions.seconds_consumed` and `devices.last_seen`, closes sessions
   whose client disappeared, **deauths every device of any account that
   hit zero**, and deauths orphaned clients. It is the source of truth
   that keeps shared multi-device balances correct.
8. A deauthed client's next web request lands back at step 2.

### Multi-device semantics

A customer account holds **one shared time balance**. Up to `device_limit`
devices (MACs) may be online at once — and **each online device burns the
balance concurrently** (2 devices online = balance drains 2× as fast).
`device_limit` comes from the redeemed voucher / approved plan and only
ever ratchets up (`GREATEST(current, new)`).

Time only. There is intentionally **no data/GB accounting anywhere**.

---

## Surfaces

| URL | What |
|---|---|
| `http://portal.cafe/` | Customer portal (phone-friendly): login/register, live countdown, devices, connect button, plan requests, voucher redeem |
| `http://portal.cafe/admin` | Admin dashboard: pending requests + active sessions (kick), plans CRUD, voucher batches (print/CSV), users (grant time), audit log |

The portal is served over plain HTTP on the LAN — captive-portal browsers
break on self-signed TLS and no public CA issues for LAN-only names.

### API sketch

- `POST /api/auth/register|login|logout`, `GET /api/auth/me` (argon2
  passwords, JWT in an httpOnly cookie, rate-limited login/register/redeem)
- `GET /api/plans`, `POST /api/requests`, `POST /api/vouchers/redeem`
- `GET /api/me/balance|sessions|devices`, `POST /api/session/connect`
- `GET/POST /api/admin/requests[/:id/approve|reject]`,
  `POST /api/admin/users/:id/grant`, `GET /api/admin/sessions/active`,
  `POST /api/admin/sessions/:mac/kick`, plans CRUD under `/api/admin/plans`,
  `POST /api/admin/vouchers/generate`, `GET /api/admin/vouchers|audit|users`
- `GET /fas` — OpenNDS FAS entry point (outside the `/api` prefix; must
  match `FasPath` in opennds.conf)

Every admin mutation and every auth/kick/cutoff event is written to
`audit_log`.

---

## Repo layout

```
install.sh / uninstall.sh     idempotent bootstrap / clean removal
.env.example                  all knobs: interfaces, subnet, secrets, ports
configs/                      templates rendered from .env at install time
  nftables.conf.tmpl          NAT (masquerade WAN) + firewall + forwarding
  dnsmasq.conf.tmpl           DHCP/DNS on LAN, portal hostname pinning
  opennds.conf.tmpl           captive portal + FAS wiring
  Caddyfile.tmpl              serves SPA, proxies /api and /fas to backend
  interfaces.tmpl             static LAN IP / DHCP WAN (ifupdown)
  sudoers-cybera.tmpl         cybera user → ndsctl only
  udev-usb-wan.rules.tmpl     USB autosuspend off for WAN adapter
  systemd/                    cybera-backend + cybera-session-manager units
backend/                      NestJS (TypeScript)
  migrations/*.sql            schema (users, plans, plan_requests, vouchers,
                              devices, sessions, audit_log)
  src/fas/                    FAS decode + HMAC sign/verify
  src/sessions/               /session/connect, kick, ndsctl integration
  src/session-manager/        the reconciler daemon
  src/scripts/                migrate + seed-admin
frontend/                     React + Vite + MUI (customer portal + admin)
scripts/cybera-usb-nosuspend  helper invoked by the udev rule
```

---

## Troubleshooting

**Portal doesn't pop up on phones.**
`systemctl status opennds` — if it failed, check `journalctl -u opennds`.
Verify `GatewayInterface` in `/etc/opennds/opennds.conf` matches `LAN_IF`
and that the phone actually got a DHCP lease from this box
(`journalctl -u dnsmasq | tail`).

**Client authorizes but has no internet.**
Check forwarding + NAT: `sysctl net.ipv4.ip_forward` must be 1;
`nft list ruleset | grep masquerade` must show the WAN interface; the WAN
adapter must hold a DHCP lease (`ip addr show <WAN_IF>`).

**"Invalid portal context" on Connect.**
The signed FAS context is stale (client re-associated and OpenNDS issued a
new `hid`). Have the customer close the browser, toggle Wi-Fi, and let the
portal reopen by itself.

**Voucher/plan credited but timer doesn't move.**
The session-manager settles consumption: `systemctl status
cybera-session-manager`, `journalctl -u cybera-session-manager -f`. It
needs `sudo ndsctl json` to work — test as root, and check
`/etc/sudoers.d/cybera` points at the right ndsctl path.

**USB WAN adapter drops under load.**
Confirm it's on USB3 with no hub; check `dmesg | grep -i usb` for
disconnects. Verify autosuspend is off:
`cat /sys/class/net/<WAN_IF>/device/../power/control` → `on`. Worst case,
set the `usbcore.autosuspend=-1` boot param.

**Re-running the installer.**
Safe. Migrations are recorded and skipped; the admin password is re-synced
from `.env`; configs are re-rendered; services restarted.

**Where do the services log?**
`journalctl -u cybera-backend -f` and
`journalctl -u cybera-session-manager -f`.
