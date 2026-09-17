# Deployment (Production)

## Production: https://digitalfix.cloud/mirage-manage

Shared VPS (`digitalfix`), `/var/www/digitalfix/projects/mirage-manage` (git clone). pm2: `mirage-manage-web` (127.0.0.1:3104, basePath `/mirage-manage`), `mirage-manage-api` (127.0.0.1:4104), PostgreSQL DB `mirage_manage`. nginx: `/etc/nginx/digitalfix/projects/mirage-manage.conf` (ასლ: `deploy/digitalfix/`). `/mirage-manage/api/*` → API.

განახლებ: `ssh digitalfix@92.205.184.159` → `cd /var/www/digitalfix/projects/mirage-manage && deploy/digitalfix/update.sh`.

Desktop exe: tag `desktop-vX.Y.Z` push → GitHub Actions → Release-ში `GameRoomClient-Setup-X.Y.Z.exe` (API URL `https://digitalfix.cloud/mirage-manage` ჩაშენებულ).

## 0. სწრაფ გზა — ერთ ბრძანებ (Ubuntu 22.04/24.04 VPS)

```bash
deploy/deploy.sh root@<IP> [domain]     # მაგ. deploy/deploy.sh root@1.2.3.4 gameroom.ge
```

- პირველ გაშვებ (`deploy/server-setup.sh`): Node 24, PostgreSQL, nginx, ufw, swap (RAM < 2 GB), `grm` user, DB, `apps/api/.env` შემთხვევით secret-ებით, systemd `grm-api` / `grm-web`, domain-ის შემთხვევაში certbot HTTPS.
- ადმინის პაროლ და `PC_AGENT_KEY` → `/root/grm-credentials.txt` (ბოლ ბეჭდდ ეკრანზ).
- შემდეგ გაშვებებ: rsync → `npm ci` → `db:deploy` → build → restart (`.env` არ იცვლებ).
- ლოგებ: `journalctl -u grm-api -f`.

Desktop exe სერვერის URL-ით (Settings-ში წინასწარ ჩაწერილ):

```bash
MAIN_VITE_DEFAULT_API_URL=https://gameroom.ge npm run dist:win -w @grm/desktop
```

## 1. სერვერ ხელით (API + Web + PostgreSQL)

მინ. 1 vCPU / 1 GB RAM (10 PC-ისთვ საკმარის). Node.js ≥ 22.12, PostgreSQL ≥ 14.

```bash
git clone <repo> game-room && cd game-room
npm ci

# API
cp apps/api/.env.example apps/api/.env
#  → DATABASE_URL, JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL/ADMIN_PASSWORD,
#    PC_AGENT_KEY (openssl rand -hex 16), WEB_URL=https://your-domain, COOKIE_SECURE=true,
#    NODE_ENV=production, SMTP_* (პაროლის აღდგენისთვ)
npm run db:deploy                 # prisma migrate deploy
npm run build -w @grm/api

# Web
echo "API_URL=http://127.0.0.1:4000" > apps/web/.env.local
npm run build -w @grm/web
```

### პროცესებ (systemd ან pm2)

```bash
npm i -g pm2
pm2 start "npm run start -w @grm/api" --name grm-api
pm2 start "npm run start -w @grm/web" --name grm-web
pm2 save && pm2 startup
```

### Reverse proxy (nginx) + HTTPS

```nginx
server {
  server_name gameroom.example.com;
  location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  # დესკტოპ კლიენტებ შეიძლება API-ს პირდაპირ მიმართონ:
  location /api/ { proxy_pass http://127.0.0.1:4000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
}
```

`certbot --nginx -d gameroom.example.com` — HTTPS.

> PC-ებ `apiUrl`-ში მიუთითეთ `https://gameroom.example.com` (API იგივე `/api` path-ზ).

## 2. PC-ებ (Electron კლიენტ)

1. Build — ერთ-ერთ:
   - **GitHub Actions** (რეკომენდებულ): repo GitHub-ზ → Actions → „Desktop Windows installer“ → Run workflow → artifact `game-room-client-windows` (`.github/workflows/desktop-windows.yml`);
   - Windows მანქანაზ: `npm ci && node node_modules/electron/install.js && npm run dist:win -w @grm/desktop` → `apps/desktop/release/*.exe`;
   - Apple Silicon Mac-ზ NSIS-ის ნამუშვ სჭირდებ Rosetta (`softwareupdate --install-rosetta`). მის გარეშ იქმნებ მხოლოდ `release/win-unpacked/GameRoomClient.exe` (installer-ის გარეშ, სწრაფ ტესტისთვ).
2. დააინსტალირეთ ყოველ PC-ზ (per-machine).
3. პირველ გაშვებ → Settings: API URL, PC ნომერ (1–10, უნიკალურ!), PC key (`PC_AGENT_KEY`), shutdown on expire.
4. დეტალებ და kiosk lockdown: [desktop.md](desktop.md).

## 3. Backup

```bash
pg_dump -Fc game_room > /backups/game_room_$(date +%F).dump    # cron-ით ყოველდღ
```

## 4. განახლებ

```bash
git pull && npm ci && npm run db:deploy && npm run build -w @grm/api && npm run build -w @grm/web
pm2 restart grm-api grm-web
```

## Checklist

- [ ] `JWT_SECRET` ≥ 32 სიმბოლ, `PC_AGENT_KEY` შემთხვევით
- [ ] `ADMIN_PASSWORD` შეცვლილ
- [ ] `COOKIE_SECURE=true`, HTTPS
- [ ] `APP_TIMEZONE` სწორ (default `Asia/Tbilisi`)
- [ ] SMTP კონფიგურირებულ (სხვაგვარ reset ბმული მხოლოდ API ლოგშ)
- [ ] `PC_COUNT` = PC-ების რაოდენობ
- [ ] DB backup cron
