#!/usr/bin/env bash
# One-time (idempotent) server provisioning for Ubuntu 22.04/24.04. Run as root.
#   server-setup.sh <public-host-or-ip> [domain]
# Installs Node 24, PostgreSQL, nginx, certbot; creates the grm user, database, apps/api/.env
# (random secrets, generated once) and systemd services grm-api / grm-web.
set -euo pipefail

PUBLIC_HOST="${1:?usage: server-setup.sh <public-host-or-ip> [domain]}"
DOMAIN="${2:-}"
APP_DIR=/opt/game-room
APP_USER=grm
ENV_FILE="$APP_DIR/apps/api/.env"
CREDS=/root/grm-credentials.txt
export DEBIAN_FRONTEND=noninteractive

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

log "packages"
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg rsync nginx postgresql openssl ufw >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

# next build needs ~1.5 GB RAM; add swap on small VPSes
if [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 1900000 ] && ! swapon --show | grep -q .; then
  log "swap 2G"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "user + directories"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash "$APP_USER"
mkdir -p "$APP_DIR/apps/api" "$APP_DIR/apps/web"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

systemctl enable --now postgresql >/dev/null

if [ ! -f "$ENV_FILE" ]; then
  log "database + .env (new secrets)"
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grm') THEN CREATE ROLE grm LOGIN; END IF;
END \$\$;
ALTER ROLE grm PASSWORD '$DB_PASS';
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='game_room'" | grep -q 1 \
    || sudo -u postgres createdb -O grm game_room

  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)"
  PC_AGENT_KEY="$(openssl rand -hex 16)"
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
DATABASE_URL="postgresql://grm:$DB_PASS@127.0.0.1:5432/game_room?schema=public"
PORT=4000
CORS_ORIGINS=http://$PUBLIC_HOST
WEB_URL=http://$PUBLIC_HOST
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=12h
COOKIE_SECURE=false
ADMIN_EMAIL=admin@gameroom.local
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_NAME=Administrator
PC_AGENT_KEY=$PC_AGENT_KEY
PC_COUNT=10
HEARTBEAT_INTERVAL_SECONDS=60
PC_ONLINE_WINDOW_SECONDS=150
SESSION_TIMEOUT_SECONDS=180
LOW_BALANCE_THRESHOLD_SECONDS=300
APP_TIMEZONE=Asia/Tbilisi
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Game Room <no-reply@gameroom.local>"
ENV
  chown "$APP_USER:$APP_USER" "$ENV_FILE" && chmod 600 "$ENV_FILE"
  umask 077
  printf 'Admin: admin@gameroom.local / %s\nPC key (desktop Settings): %s\n' "$ADMIN_PASSWORD" "$PC_AGENT_KEY" > "$CREDS"
fi
echo "API_URL=http://127.0.0.1:4000" > "$APP_DIR/apps/web/.env.local"
chown "$APP_USER:$APP_USER" "$APP_DIR/apps/web/.env.local"

log "systemd services"
cat > /etc/systemd/system/grm-api.service <<UNIT
[Unit]
Description=Game Room API
After=network.target postgresql.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/apps/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/grm-web.service <<UNIT
[Unit]
Description=Game Room Web
After=network.target grm-api.service

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/apps/web
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $APP_DIR/node_modules/next/dist/bin/next start -p 3000 -H 127.0.0.1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable grm-api grm-web >/dev/null

log "nginx"
SERVER_NAME="${DOMAIN:-_}"
cat > /etc/nginx/sites-available/game-room <<NGINX
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name $SERVER_NAME;
  client_max_body_size 5m;

  # Desktop clients and the browser both hit /api directly on the API
  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/game-room /etc/nginx/sites-enabled/game-room
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx

ufw allow OpenSSH >/dev/null && ufw allow 'Nginx Full' >/dev/null && ufw --force enable >/dev/null

BASE_URL="http://$PUBLIC_HOST"
if [ -n "$DOMAIN" ]; then
  log "HTTPS for $DOMAIN"
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
    BASE_URL="https://$DOMAIN"
  else
    echo "!! certbot failed (does DNS A record of $DOMAIN point here?) — staying on HTTP" >&2
    BASE_URL="http://$DOMAIN"
  fi
fi
SECURE=false; [[ "$BASE_URL" == https://* ]] && SECURE=true
sed -i "s#^WEB_URL=.*#WEB_URL=$BASE_URL#; s#^CORS_ORIGINS=.*#CORS_ORIGINS=$BASE_URL#; s#^COOKIE_SECURE=.*#COOKIE_SECURE=$SECURE#" "$ENV_FILE"
echo "$BASE_URL" > "$APP_DIR/.base-url"
