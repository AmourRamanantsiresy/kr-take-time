#!/usr/bin/env bash
# Reverses install.sh. Pass --drop-db to also destroy the database.
set -euo pipefail

[ "$(id -u)" -eq 0 ] || { echo "run as root: sudo ./uninstall.sh"; exit 1; }

DROP_DB=0
[ "${1:-}" = "--drop-db" ] && DROP_DB=1

[ -f .env ] && { set -a; . ./.env; set +a; }

echo "==> Stopping and disabling services"
systemctl disable --now cybera-backend cybera-session-manager 2>/dev/null || true
systemctl disable --now opennds 2>/dev/null || true

echo "==> Removing installed files"
rm -f /etc/systemd/system/cybera-backend.service \
      /etc/systemd/system/cybera-session-manager.service
systemctl daemon-reload
rm -f /etc/sudoers.d/cybera
rm -f /etc/dnsmasq.d/cybera.conf
rm -f /etc/network/interfaces.d/cybera
rm -f /etc/sysctl.d/90-cybera.conf
rm -f /etc/udev/rules.d/90-cybera-usb-wan.rules
rm -f /etc/NetworkManager/conf.d/90-cybera-unmanaged.conf
rm -rf /etc/systemd/system/opennds.service.d
rm -rf /opt/cybera
rm -f /usr/local/bin/cybera-usb-nosuspend
rm -rf /etc/cybera
udevadm control --reload 2>/dev/null || true

echo "==> Restarting shared daemons with their remaining config"
systemctl restart dnsmasq 2>/dev/null || true
systemctl restart caddy 2>/dev/null || true

if [ "$DROP_DB" -eq 1 ] && [ -n "${DB_NAME:-}" ]; then
  echo "==> Dropping database $DB_NAME and role $DB_USER"
  sudo -u postgres dropdb --if-exists "$DB_NAME"
  sudo -u postgres dropuser --if-exists "$DB_USER"
fi

if id cybera >/dev/null 2>&1; then
  userdel cybera 2>/dev/null || true
fi

cat <<'EOF'
Done. Left in place on purpose (shared system config — review manually):
  /etc/nftables.conf      (restore your own firewall rules)
  /etc/config/opennds
  /etc/caddy/Caddyfile
  apt packages (nftables, dnsmasq, opennds, postgresql, caddy, nodejs)
EOF
