# API Reference

Base URL: `http://localhost:4000/api` (ვები იძახის `/api/*`-ს საკუთარ origin-ზ; Next.js rewrite → API).

## ზოგადი

- JSON body / JSON response. თარიღებ — ISO 8601 (UTC).
- ბალანსი და ხანგრძლივობ — **წამებ** (`...Seconds`). ბალანსის შეყვან — **საათებ** (`hours`, `balanceHours`).
- Pagination: `?page=1&pageSize=20` → `{ items, total, page, pageSize }` (pageSize ≤ 200).
- შეცდომ ყოველთვ:

```json
{ "statusCode": 409, "code": "EMAIL_TAKEN", "message": "Email is already in use", "details": {} }
```

`code`-ების სრული სია: `apps/api/src/common/api-error.ts` (თარგმანებ: `packages/shared/src/i18n.ts`).

## ავტორიზაცი

| Client | მეთოდ |
|---|---|
| Web (admin/user) | httpOnly cookie `grm_token` (JWT, `JWT_EXPIRES_IN`), ან `Authorization: Bearer <accessToken>` |
| Desktop | header `x-pc-key: <PC_AGENT_KEY>` + login-ის შემდეგ `Authorization: Bearer <sessionToken>` |

Roles: `admin` — ყველ `/users`, `/pcs`, `/alerts`, `/reports`; `user` — `/me`, `/auth/change-password`.

---

## Auth — `/auth`

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/admin/login` | public | `{ email, password }` | `{ principal, accessToken }` + cookie |
| POST | `/auth/login` | public | `{ login, password }` (login = email ან ტელ.) | `{ principal, accessToken }` + cookie |
| POST | `/auth/logout` | public | — | `{ ok }`, cookie წაიშლ |
| GET | `/auth/me` | any | — | `{ role:'admin', admin }` ან `{ role:'user', user: UserDto }` |
| POST | `/auth/forgot-password` | public | `{ email }` | `{ ok }` (ყოველთვ, email enumeration-ის წინააღმდეგ) |
| POST | `/auth/reset-password` | public | `{ token, password }` | `{ ok }` / `INVALID_RESET_TOKEN` |
| POST | `/auth/change-password` | user | `{ currentPassword, newPassword }` | `{ ok, accessToken }` + ახალი cookie (ძველი token-ებ invalid) |

Rate limits: login 20/წთ, forgot 5/წთ (IP-ზ).

## Users — `/users` (admin)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/users` | `?search&status=all\|active\|inactive&page&pageSize` | `Paginated<UserDto>` |
| POST | `/users` | `{ name, email, phone, password, balanceHours?, isActive? }` | `UserDto` (201) |
| GET | `/users/:id` | — | `UserDto & { stats }` |
| PATCH | `/users/:id` | `{ name?, email?, phone?, password?, isActive? }` | `UserDetailDto` |
| DELETE | `/users/:id` | — | `{ ok }` (soft delete; `USER_HAS_ACTIVE_SESSION` თუ PC-ზე შესულ) |
| POST | `/users/:id/balance` | `{ operation: 'add'\|'subtract'\|'set', hours, note? }` | `{ user, transaction }` |
| GET | `/users/:id/transactions` | page | `Paginated<TransactionDto>` |
| GET | `/users/:id/sessions` | page | `Paginated<SessionDto>` |

```ts
UserDto = { id, name, email, phone, balanceSeconds, isActive, createdAt, updatedAt,
            activeSession: { id, startedAt, lastHeartbeatAt, consumedSeconds, pc: {id, number, name} } | null }
```

## Me — `/me` (user)

| Method | Path | Response |
|---|---|---|
| GET | `/me` | `UserDetailDto` |
| GET | `/me/transactions` | `Paginated<TransactionDto>` |
| GET | `/me/sessions` | `Paginated<SessionDto>` |

## PCs — `/pcs` (admin)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/pcs` | — | `{ serverTime, heartbeatIntervalSeconds, summary: {total, online, busy}, items: PcDto[] }` |
| PATCH | `/pcs/:id` | `{ name }` | `{ ok }` |
| POST | `/pcs/:id/command` | `{ command: 'LOGOUT'\|'SHUTDOWN' }` | `{ ok, endedSessionId }` — სესია ხურავს მომენტალურ |
| DELETE | `/pcs/:id/command` | — | pending ბრძანების გაუქმებ |

`online` = heartbeat ბოლ `PC_ONLINE_WINDOW_SECONDS` (150) წამშ.

## Alerts — `/alerts` (admin)

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/alerts` | `?status=open\|all&afterId&page&pageSize` | `Paginated<AlertDto> & { openCount }` |
| POST | `/alerts/:id/ack` | — | `{ ok }` |
| POST | `/alerts/ack-all` | — | `{ ok, count }` |

## Reports — `/reports` (admin)

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/reports/summary` | `from=YYYY-MM-DD&to=YYYY-MM-DD` (inclusive, `APP_TIMEZONE`, ≤ 366 დღ) | `{ totals, byDay[], byUser[], byPc[] }` |
| GET | `/reports/sessions` | `from, to, userId?, pcId?, page, pageSize` | `Paginated<SessionDto>` |

სესია მიეკუთვნებ **დაწყების** დღ; ტრანზაქცია — შექმნის დღ.

## Desktop — `/desktop` (header `x-pc-key`)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/desktop/heartbeat` | `{ pcNumber, appVersion?, currentGame? }` (+ Bearer sessionToken თუ შესულ) | `DesktopHeartbeatResponse` — `currentGame` ინახებ მხოლოდ ACTIVE სესიის დროს (ადმინ ხედავს `PcDto.currentSession.game`) |
| POST | `/desktop/login` | `{ pcNumber, login, password, appVersion? }` | `DesktopLoginResponse` |
| POST | `/desktop/logout` | `{ pcNumber, reason: 'USER'\|'EXPIRED' }` + Bearer | `{ session }` |
| POST | `/desktop/verify-admin` | `{ email, password }` | `{ ok: boolean }` — kiosk settings-ის განბლოკვ |

```ts
DesktopHeartbeatResponse = {
  serverTime, pc: { id, number, name },
  command: 'LOGOUT' | 'SHUTDOWN' | null,        // ერთხელ მიწოდებ
  session: DesktopSessionState | null,          // null თუ token არ გაიგზავნ
  sessionError: 'INVALID_SESSION_TOKEN' | null,
  heartbeatIntervalSeconds, lowBalanceThresholdSeconds
}
DesktopSessionState = { id, status, startedAt, endedAt, endReason, consumedSeconds, balanceSeconds, user: { id, name } }
```

Login errors: `INVALID_CREDENTIALS` 401, `USER_INACTIVE` 403, `NO_BALANCE` 403, `ALREADY_LOGGED_IN_ELSEWHERE` 409 (`details.pcNumber`), `PC_NOT_FOUND` 404, `INVALID_PC_KEY` 401.

## Games — `/games` (admin) და `/desktop/games`

| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/games` | admin | — | `GameDto[]` (ყველ, `sortOrder, name`) |
| POST | `/games` | admin | `GameInput` | `GameDto` (201) |
| PATCH | `/games/:id` | admin | partial `GameInput` | `GameDto` |
| DELETE | `/games/:id` | admin | — | `{ ok }` / `GAME_NOT_FOUND` |
| GET | `/desktop/games` | `x-pc-key` + Bearer sessionToken | `?pcNumber=N` | `{ items: DesktopGame[] }` — მხოლოდ აქტიურ; `401 INVALID_SESSION_TOKEN` თუ სესია არ არის ACTIVE |

```ts
GameInput = { name, launchType: 'STEAM' | 'EXE' | 'URL',
              steamAppId?,            // STEAM → steam://rungameid/<id>
              exePath?, args?,        // EXE   → spawn(exePath, args)
              url?,                   // URL   → shell.openExternal(url)
              processNames?: string[],// Windows image names, სესიის ბოლ taskkill
              imageUrl?, isActive?, sortOrder? }
```

ვალიდაცი: STEAM → `steamAppId`, EXE → `exePath`, URL → `url`, სხვაგვარ `400 GAME_LAUNCH_CONFIG_INVALID`. ცარიელ ცხრილ API-ს სტარტზ ივსებ default-ებით: Steam, CS2 (730), Dota 2 (570), PUBG (578080), League of Legends, VALORANT (Riot Client), Fortnite (Epic URL).

## Health

`GET /health` → `{ ok: true, time }` (public)

## curl მაგალით

```bash
# admin login (cookie jar)
curl -c /tmp/c -H 'content-type: application/json' \
  -d '{"email":"admin@gameroom.local","password":"Admin12345"}' localhost:4000/api/auth/admin/login
curl -b /tmp/c localhost:4000/api/pcs

# desktop heartbeat
curl -H 'x-pc-key: dev-pc-key' -H 'content-type: application/json' \
  -d '{"pcNumber":1}' localhost:4000/api/desktop/heartbeat
```
