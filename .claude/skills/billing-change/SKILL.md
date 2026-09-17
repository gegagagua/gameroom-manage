---
name: billing-change
description: Safety checklist for changing time billing, sessions, heartbeats, alerts or balance logic (apps/api/src/sessions/billing.service.ts, users/balance.service.ts). Use before editing anything that can change how much time a customer is charged.
---

# Changing billing safely

Billing mistakes cost real money and customer trust. Work through this list.

## Read first

- `docs/billing.md` — invariants, formula, edge-case table (source of truth).
- `apps/api/src/sessions/billing.service.ts` — `pcLogin`, `heartbeat`, `pcLogout`, `charge`, `endLocked`, `closeStaleSessions`.
- `apps/api/test/app.e2e-spec.ts` — `describe('desktop billing')`.

## Invariants you must keep

1. `users.balance_seconds >= 0` always; charges are `min(elapsed, balance)`.
2. Server clock only (`ClockService`); client timestamps are never trusted.
3. `last_billed_at` advances by whole elapsed seconds (sub-second remainder carries over).
4. One `SESSION_CHARGE` transaction per session, always `amount = -consumed_seconds`.
5. At most one ACTIVE session per user and per PC.
6. Lock order `pcs → users (asc) → sessions`; re-read rows after acquiring locks.
7. Desktop polling stays at one heartbeat per `HEARTBEAT_INTERVAL_SECONDS` (60) — product requirement, no sockets.
8. `BALANCE_DEPLETED` always produces exactly one alert; `LOW_BALANCE` at most once per session.

## Process

1. Write the new rule into the edge-case table in `docs/billing.md` first.
2. Add/adjust an e2e test using `clock.advance(seconds)` that fails before your change.
3. Implement. Never throw inside a `$transaction` after writing state you want committed — return an outcome and throw after the transaction (see `pcLogin`).
4. `cd apps/api && npx tsc --noEmit -p tsconfig.json && npm test` — all green.
5. If the desktop must react differently, update `apps/desktop/src/main/session-manager.ts` and `docs/desktop.md`.
6. If a response shape changed, update `packages/shared/src/types.ts` and both clients.

## Quick manual check

```bash
KEY='x-pc-key: dev-pc-key'; J='content-type: application/json'
curl -s -H "$KEY" -H "$J" -d '{"pcNumber":1,"login":"<email>","password":"<pw>"}' localhost:4000/api/desktop/login
# wait > 60 s, then heartbeat with the returned token and compare balanceSeconds
curl -s -H "$KEY" -H "$J" -H "Authorization: Bearer <token>" -d '{"pcNumber":1}' localhost:4000/api/desktop/heartbeat
```
