#!/usr/bin/env bash
# Update https://digitalfix.cloud/mirage-manage. Run ON the server:
#   cd /var/www/digitalfix/projects/mirage-manage && deploy/digitalfix/update.sh
# Env files (not in git): apps/api/.env (PORT=4104, DB mirage_manage), apps/web/.env.local (API_URL, NEXT_BASE_PATH=/mirage-manage).
# nginx: deploy/digitalfix/mirage-manage.nginx.conf → /etc/nginx/digitalfix/projects/mirage-manage.conf
set -euo pipefail
cd "$(dirname "$0")/../.."
export ELECTRON_SKIP_BINARY_DOWNLOAD=1 NEXT_TELEMETRY_DISABLED=1
git pull --ff-only
npm ci --no-audit --no-fund --loglevel=error
npm run db:deploy
npm run build -w @grm/api
NODE_OPTIONS=--max-old-space-size=1536 npm run build -w @grm/web
pm2 startOrReload deploy/digitalfix/ecosystem.config.cjs --update-env
pm2 save
