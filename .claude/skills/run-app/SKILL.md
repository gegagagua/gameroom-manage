---
name: run-app
description: Start the game room stack locally (PostgreSQL, NestJS API, Next.js web, Electron kiosk) and smoke-test it. Use when asked to run, start, demo or verify the app end-to-end.
---

# Run the Game Room stack

## 1. Prerequisites (check, don't assume)

```bash
node -v                                   # >= 22.12
psql -d postgres -Atc 'select 1'          # Homebrew PostgreSQL 17 must be running
psql -d postgres -Atc "select datname from pg_database where datname like 'game_room%'"
ls node_modules/electron/dist >/dev/null  # Electron binary present (npm 11 allowScripts!)
```

Missing DBs → `createdb game_room && createdb game_room_test`.
Missing Electron binary → `npm approve-scripts electron esbuild && node node_modules/electron/install.js`.
Missing `apps/api/.env` → copy `.env.example`, set `DATABASE_URL`, `JWT_SECRET`, `PC_AGENT_KEY`.

## 2. Database

```bash
npm run db:migrate            # prisma migrate dev (also generates the client)
```

## 3. Start services (each in background, logs to scratchpad)

| Service | Command | URL |
|---|---|---|
| API | `npm run dev:api` | http://localhost:4000/api/health |
| Web | `npm run dev:web` | http://localhost:3000 |
| Desktop | `GRM_WINDOWED=1 GRM_API_URL=http://localhost:4000 GRM_PC_NUMBER=1 GRM_PC_KEY=dev-pc-key npm run dev:desktop` | full-screen kiosk by default — **always pass `GRM_WINDOWED=1` on a dev machine** |

Before starting, check the port is free (`lsof -i :4000 -i :3000`) — a previous API may already be running; reuse it instead of starting a second one.

## 4. Smoke test (API)

```bash
curl -s localhost:4000/api/health
curl -s -c /tmp/grm -H 'content-type: application/json' \
  -d '{"email":"admin@gameroom.local","password":"Admin12345"}' localhost:4000/api/auth/admin/login
curl -s -b /tmp/grm localhost:4000/api/pcs | head -c 400
curl -s -H 'x-pc-key: dev-pc-key' -H 'content-type: application/json' -d '{"pcNumber":1}' \
  localhost:4000/api/desktop/heartbeat
```

Through the web proxy use `localhost:3000/api/...` — same responses.

## 5. Automated tests

```bash
npm test          # API e2e (resets game_room_test; ~5 s)
npm run typecheck
```

## Credentials (dev)

- Admin: `admin@gameroom.local` / `Admin12345` (from `apps/api/.env`)
- PC key: `dev-pc-key`
- Customers: create via admin UI or `POST /api/users`.

## Gotchas

- Desktop polls once per 60 s — the web shows changes with up to ~60 s delay; that's by design.
- Real shutdown is dry-run in unpackaged dev builds; set `GRM_REAL_SHUTDOWN=1` only on a disposable machine.
- Stop background servers you started when finished.
