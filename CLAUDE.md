# Game Room Manage — CLAUDE.md

Internet cafe / game room management. Customers buy **time** (hours); PCs run a kiosk client that counts it down.

## Layout (npm workspaces)

| Path | What | Stack |
|---|---|---|
| `apps/api` | REST API, billing, cron sweep | NestJS 11, Prisma 6, PostgreSQL |
| `apps/web` | Admin panel + customer profile | Next.js 16 App Router, Tailwind 4, SWR |
| `apps/desktop` | Full-screen kiosk client (customer only) | Electron + electron-vite + React |
| `packages/shared` | TS types, error-code translations, time formatting, ka/en strings | TS source (no build) |
| `docs/` | requirements, api, billing, architecture, desktop, deployment (Georgian) |

Versions are deliberately pinned: NestJS 11 (12 is ESM-only), Prisma 6 (7+ requires driver adapters), TypeScript 5.9 (7 = native port, decorator metadata risk). Don't bump majors casually.

## Commands

```bash
npm run dev:api          # API on :4000 (nest --watch)
npm run dev:web          # web on :3000 (proxies /api → API_URL)
npm run dev:desktop      # Electron kiosk (dev = windowed, shutdown dry-run)
npm test                 # API e2e suite (resets game_room_test DB)
npm run typecheck        # all workspaces
npm run db:migrate       # prisma migrate dev (apps/api)
```

Local DB: Homebrew PostgreSQL 17, user `g.gagua` without password; databases `game_room`, `game_room_test`.
Env: `apps/api/.env` (copy `.env.example`), `apps/web/.env.local`, desktop settings live in Electron `userData/config.json`.
Dev admin: `admin@gameroom.local` / `Admin12345`; dev PC key: `dev-pc-key`.

## Core rules — read before touching billing

- Balances/durations are **integer seconds** everywhere in the DB/API. Only the UI converts to hours. Admin input is `hours` (decimal).
- Billing is server-side only (`apps/api/src/sessions/billing.service.ts`); see `docs/billing.md` for invariants + edge-case table. Update both docs and `apps/api/test/app.e2e-spec.ts` when changing behavior.
- Row-lock order: `pcs → users (asc id) → sessions` (helpers in `common/prisma.service.ts`). Keep it.
- Desktop ↔ API is **HTTP polling, once per 60 s** (`/desktop/heartbeat`). No WebSockets — this is a product requirement. The only extra calls are login/logout events.
- "Now" comes from `ClockService` (tests replace it with a fake clock). Never call `new Date()` in billing code.
- Errors: throw `ApiError` with an `ErrorCode`; add new codes to `apps/api/src/common/api-error.ts` **and** translations in `packages/shared/src/i18n.ts`.
- Admin-only routes: `@Roles('admin')`; public routes: `@Public()`; desktop routes: `@Public()` + `PcKeyGuard`.
- Users are soft-deleted (email/phone rewritten to `deleted:<id>:...`).
- UI text: Georgian default, English secondary — never hardcode strings in only one language.
- Real PC shutdown is disabled in unpackaged dev builds (dry-run) — do not remove that guard; it would power off the developer machine.

## Project skills

`.claude/skills/`: `run-app` (start everything / smoke test), `api-module` (add a NestJS feature the house way), `billing-change` (checklist for billing edits), `web-ui` (adding pages to the Next.js app), `desktop-client` (Electron kiosk internals & packaging).

Dev-only desktop env hooks (ignored in packaged builds): `GRM_API_URL`, `GRM_PC_NUMBER`, `GRM_PC_KEY`, `GRM_AUTOLOGIN=login:password`, `GRM_AUTOLAUNCH=<game>`, `GRM_WINDOWED=1`. Never set `GRM_REAL_SHUTDOWN=1` or `GRM_REAL_LAUNCH=1` on a dev machine.

Desktop window rule (user requirement): the kiosk is ALWAYS exactly 100%×100% of the primary display, not resizable/movable/minimizable, in every build. `GRM_WINDOWED=1` is the only (dev-only) escape hatch — use it when running the client on a developer machine so the screen isn't locked. Target OS for PCs: Windows 10/11 x64. While a game runs the window becomes a fixed-size always-on-top timer widget; game processes (`processNames`) are killed when the session ends.
