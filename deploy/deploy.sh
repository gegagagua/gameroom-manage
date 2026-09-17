#!/usr/bin/env bash
# Deploy API + Web from this machine to an Ubuntu VPS over SSH (no git remote needed).
#   deploy/deploy.sh root@1.2.3.4 [domain]
# First run provisions the server (deploy/server-setup.sh); later runs just sync, migrate, build, restart.
set -euo pipefail

TARGET="${1:?usage: deploy/deploy.sh user@host [domain]}"
DOMAIN="${2:-}"
HOST="${TARGET#*@}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR=/opt/game-room

SUDO=""; [ "${TARGET%%@*}" != "root" ] && [ "$TARGET" != "$HOST" ] && SUDO="sudo"

echo "==> provisioning $TARGET"
ssh "$TARGET" "$SUDO bash -s -- '$HOST' '$DOMAIN'" < "$ROOT/deploy/server-setup.sh"

echo "==> syncing sources"
rsync -az --delete --rsync-path="$SUDO rsync" \
  --exclude node_modules --exclude .git --exclude .claude --exclude .github \
  --exclude dist --exclude out --exclude .next --exclude release --exclude '*.tsbuildinfo' \
  --exclude .env --exclude .env.local --exclude .env.test --exclude .base-url --exclude .DS_Store \
  "$ROOT/" "$TARGET:$APP_DIR/"

echo "==> install, migrate, build, restart"
ssh "$TARGET" "$SUDO bash -s" <<REMOTE
set -euo pipefail
cd $APP_DIR
chown -R grm:grm .
run() { sudo -u grm -H env ELECTRON_SKIP_BINARY_DOWNLOAD=1 NEXT_TELEMETRY_DISABLED=1 "\$@"; }
run npm ci --no-audit --no-fund --loglevel=error
run npm run db:deploy
run npm run build -w @grm/api
run npm run build -w @grm/web
systemctl restart grm-api grm-web
for i in \$(seq 1 60); do [ "\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/ || true)" != "000" ] && break; sleep 1; done
systemctl --no-pager --lines=5 status grm-api grm-web | grep -E 'Active:|●'
echo
echo "URL: \$(cat .base-url)"
[ -f /root/grm-credentials.txt ] && cat /root/grm-credentials.txt || true
REMOTE
