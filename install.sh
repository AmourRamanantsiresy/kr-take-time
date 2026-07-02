#!/usr/bin/env bash
# Cybera — cyber-café captive-portal gateway installer.
# Idempotent: safe to re-run after fixing .env or pulling updates.
#
# IMPORTANT: run this while the box still has working internet (packages
# are pulled from the network) — it reconfigures the NICs at the end.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mFATAL: %s\033[0m\n' "$*" >&2; exit 1; }

# ── 1. Preconditions ──────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || die "run as root: sudo ./install.sh"
[ -f /etc/os-release ] || die "cannot detect OS"
. /etc/os-release
[ "${ID:-}" = "debian" ] || die "this installer targets Debian (found: ${ID:-unknown})"
if [ "${VERSION_ID:-}" != "13" ]; then
  warn "expected Debian 13 (Trixie), found ${VERSION_ID:-unknown} — continuing, but this is untested"
fi

[ -f .env ] || die "no .env found. Run: cp .env.example .env  — then edit it."

# ── 2. Show candidate interfaces so the operator can sanity-check .env ─
log "Detected network interfaces:"
ip -o link show | awk -F': ' '{print "    " $2}' | grep -v '^    lo$' || true

set -a; . ./.env; set +a

for v in WAN_IF LAN_IF LAN_SUBNET LAN_GATEWAY_IP DHCP_RANGE GATEWAY_NAME \
         PORTAL_HOST FAS_KEY DB_NAME DB_USER DB_PASS JWT_SECRET \
         ADMIN_USER ADMIN_PASS BACKEND_PORT; do
  [ -n "${!v:-}" ] || die "missing $v in .env"
done
case "$FAS_KEY$JWT_SECRET$DB_PASS$ADMIN_PASS" in
  *change-me*) die ".env still contains change-me placeholders — edit it first" ;;
esac

ip link show "$WAN_IF" >/dev/null 2>&1 || warn "WAN_IF=$WAN_IF not present right now (adapter unplugged?)"
ip link show "$LAN_IF" >/dev/null 2>&1 || die  "LAN_IF=$LAN_IF does not exist — fix .env"

# Wi-Fi WAN (e.g. the box joins Starlink's Wi-Fi): the association is
# left to NetworkManager; ifupdown only ever manages a wired WAN.
WAN_IS_WIFI=0
if [ -d "/sys/class/net/$WAN_IF/wireless" ]; then
  WAN_IS_WIFI=1
fi
WAN_KIND="wired"
[ "$WAN_IS_WIFI" -eq 1 ] && WAN_KIND="Wi-Fi"

echo
echo "    WAN (Starlink, $WAN_KIND): $WAN_IF"
echo "    LAN (users)          : $LAN_IF  ->  $LAN_GATEWAY_IP ($LAN_SUBNET)"
echo "    Portal               : http://$PORTAL_HOST"
echo
read -r -p "Proceed with these settings? [y/N] " ans
[ "${ans,,}" = "y" ] || die "aborted"

# Derived values used by templates
LAN_NETMASK="$(python3 - "$LAN_SUBNET" <<'EOF'
import ipaddress, sys
print(ipaddress.ip_network(sys.argv[1], strict=False).netmask)
EOF
)"
# Runtime deploy target. The repo often lives under /home/<user>, which
# the cybera service user and caddy cannot traverse (0700 home dirs) —
# the built app is copied to /opt where services can read it.
APP_DIR=/opt/cybera
export LAN_NETMASK APP_DIR

# ── 3. Packages ───────────────────────────────────────────────────────
log "Installing packages (needs internet!)"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nftables dnsmasq opennds postgresql caddy curl \
  ca-certificates sudo gettext-base python3 ifupdown rsync

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2-3 | tr -d .)" -lt 20 ]; then
  log "Installing Node.js 22 LTS (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

NDSCTL_PATH="$(command -v ndsctl)" || die "ndsctl not found after installing opennds"
export NDSCTL_PATH

# ── 4. Service user ───────────────────────────────────────────────────
if ! id cybera >/dev/null 2>&1; then
  log "Creating service user 'cybera'"
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin cybera
fi

# ── 5. PostgreSQL: role + database ────────────────────────────────────
log "Configuring PostgreSQL"
systemctl enable --now postgresql
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -c "ALTER ROLE \"$DB_USER\" WITH LOGIN PASSWORD '$DB_PASS'"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# ── 6. Build backend + frontend ───────────────────────────────────────
log "Building backend"
(cd backend && npm ci && npm run build)

log "Building frontend"
(cd frontend && npm ci && npm run build)

# ── 7. Migrations + admin seed ────────────────────────────────────────
log "Running migrations and seeding admin user"
(cd backend && node dist/scripts/migrate.js && node dist/scripts/seed-admin.js)

# ── 8. Deploy runtime to /opt ─────────────────────────────────────────
log "Deploying runtime to $APP_DIR"
install -d "$APP_DIR/backend" "$APP_DIR/frontend"
rsync -a --delete backend/dist backend/node_modules backend/migrations backend/package.json "$APP_DIR/backend/"
rsync -a --delete frontend/dist "$APP_DIR/frontend/"

# ── 9. Render config templates ────────────────────────────────────────
log "Rendering configuration"
TVARS='${WAN_IF} ${LAN_IF} ${LAN_SUBNET} ${LAN_GATEWAY_IP} ${LAN_NETMASK} ${DHCP_RANGE} ${GATEWAY_NAME} ${PORTAL_HOST} ${FAS_KEY} ${BACKEND_PORT} ${APP_DIR} ${NDSCTL_PATH}'
render() { envsubst "$TVARS" < "$1" > "$2"; }

render configs/nftables.conf.tmpl  /etc/nftables.conf
render configs/dnsmasq.conf.tmpl   /etc/dnsmasq.d/cybera.conf
render configs/opennds.conf.tmpl   /etc/opennds/opennds.conf
render configs/Caddyfile.tmpl      /etc/caddy/Caddyfile
render configs/interfaces.tmpl     /etc/network/interfaces.d/cybera
if [ "$WAN_IS_WIFI" -eq 0 ]; then
  envsubst "$TVARS" < configs/interfaces-wan.tmpl >> /etc/network/interfaces.d/cybera
fi
install -m 644 configs/sysctl-cybera.conf /etc/sysctl.d/90-cybera.conf

# Runtime env for the services (root-owned, group-readable by cybera)
install -d -m 750 -o root -g cybera /etc/cybera
{
  cat .env
  echo "NDSCTL_PATH=$NDSCTL_PATH"
  echo "NODE_ENV=production"
} > /etc/cybera/cybera.env
chown root:cybera /etc/cybera/cybera.env
chmod 640 /etc/cybera/cybera.env

# ── 10. USB autosuspend off for USB gateway interfaces ────────────────
log "Disabling USB autosuspend for USB-attached gateway interfaces"
install -m 755 scripts/cybera-usb-nosuspend /usr/local/bin/cybera-usb-nosuspend
render configs/udev-usb-wan.rules.tmpl /etc/udev/rules.d/90-cybera-usb-wan.rules
udevadm control --reload
/usr/local/bin/cybera-usb-nosuspend "$WAN_IF" || true
/usr/local/bin/cybera-usb-nosuspend "$LAN_IF" || true

# ── 11. Scoped sudoers for ndsctl ─────────────────────────────────────
log "Installing scoped sudoers entry (cybera -> ndsctl only)"
render configs/sudoers-cybera.tmpl /etc/sudoers.d/cybera
chmod 440 /etc/sudoers.d/cybera
visudo -cf /etc/sudoers.d/cybera >/dev/null || die "generated sudoers entry is invalid"

# ── 12. systemd units + service enablement ────────────────────────────
log "Installing systemd units"
render configs/systemd/cybera-backend.service.tmpl         /etc/systemd/system/cybera-backend.service
render configs/systemd/cybera-session-manager.service.tmpl /etc/systemd/system/cybera-session-manager.service

# OpenNDS must outlive a slow-appearing LAN interface (USB adapters
# enumerate late at boot); the stock unit gives up instead of retrying.
install -d /etc/systemd/system/opennds.service.d
cat > /etc/systemd/system/opennds.service.d/cybera.conf <<'OVEOF'
[Unit]
After=network-online.target
Wants=network-online.target

[Service]
Restart=on-failure
RestartSec=5
OVEOF

systemctl daemon-reload

log "Applying network configuration"
sysctl --system >/dev/null

# Desktop installs: NetworkManager must hand the ifupdown-managed NICs
# over, or it will keep rewriting their addresses. A Wi-Fi WAN stays
# with NetworkManager (it owns the association + credentials); it just
# gets pinned to autoconnect system-wide.
if systemctl is-active --quiet NetworkManager 2>/dev/null; then
  if [ "$WAN_IS_WIFI" -eq 1 ]; then
    UNMANAGED="interface-name:${LAN_IF}"
    warn "Wi-Fi WAN: leaving $WAN_IF under NetworkManager control"
    WIFI_CON="$(nmcli -t -f NAME,DEVICE connection show --active 2>/dev/null \
      | awk -F: -v dev="$WAN_IF" '$2 == dev { print $1; exit }')"
    if [ -n "$WIFI_CON" ]; then
      nmcli connection modify "$WIFI_CON" \
        connection.autoconnect yes connection.permissions '' || true
      echo "    Wi-Fi connection '$WIFI_CON' pinned to autoconnect for all users"
    else
      warn "$WAN_IF has no active Wi-Fi connection — join the Starlink Wi-Fi, then re-run"
    fi
  else
    UNMANAGED="interface-name:${WAN_IF};interface-name:${LAN_IF}"
    warn "NetworkManager detected — marking $WAN_IF and $LAN_IF as unmanaged"
  fi
  install -d /etc/NetworkManager/conf.d
  cat > /etc/NetworkManager/conf.d/90-cybera-unmanaged.conf <<NMEOF
[keyfile]
unmanaged-devices=${UNMANAGED}
NMEOF
  systemctl reload NetworkManager 2>/dev/null || systemctl restart NetworkManager
elif [ "$WAN_IS_WIFI" -eq 1 ]; then
  warn "Wi-Fi WAN but NetworkManager is not running — configure wpa_supplicant for $WAN_IF yourself"
fi

# dnsmasq must own :53 — make sure nothing else does
if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
  warn "systemd-resolved is active — disabling its stub listener"
  systemctl disable --now systemd-resolved
fi

if [ "$WAN_IS_WIFI" -eq 0 ]; then
  ifup "$WAN_IF" 2>/dev/null || true
fi
ifup "$LAN_IF" 2>/dev/null || ip addr replace "${LAN_GATEWAY_IP}/$(echo "$LAN_SUBNET" | cut -d/ -f2)" dev "$LAN_IF"
ip link set "$LAN_IF" up

systemctl enable --now nftables
nft -f /etc/nftables.conf
systemctl enable --now dnsmasq
systemctl restart dnsmasq
systemctl enable --now opennds
systemctl restart opennds
systemctl enable --now caddy
systemctl restart caddy
systemctl enable --now cybera-backend
systemctl restart cybera-backend
systemctl enable --now cybera-session-manager
systemctl restart cybera-session-manager

# ── 13. Summary ───────────────────────────────────────────────────────
log "Install complete"
cat <<EOF

  Portal (customers) : http://$PORTAL_HOST/        (or http://$LAN_GATEWAY_IP/)
  Admin dashboard    : http://$PORTAL_HOST/admin
  Admin login        : $ADMIN_USER / (the ADMIN_PASS from .env)

  Next steps:
    1. Plug the router (AP/bridge mode) into the onboard NIC ($LAN_IF).
    2. Plug Starlink into the USB adapter ($WAN_IF).
    3. Connect a phone to the Wi-Fi — the captive portal should pop up.

  Service status:  systemctl status cybera-backend cybera-session-manager opennds dnsmasq caddy
  Logs:            journalctl -u cybera-backend -f
EOF
