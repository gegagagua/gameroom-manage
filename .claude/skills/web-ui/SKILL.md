---
name: web-ui
description: Conventions for adding or changing pages in apps/web (Next.js 16 admin/customer UI) — fetch wrapper, SWR keys, i18n strings, modals, toasts, balance formatting. Use when touching apps/web.
---

# Web UI conventions (`apps/web`)

Next.js 16 App Router, Tailwind 4, SWR. All pages are `'use client'`. Read `docs/web.md` for the page map.

## Data access

- **Never call `fetch` directly.** Use `api<T>(path, { method, body })` from `@/lib/api`. `path` is relative to `/api` (`/users?page=1`). It throws `ApiRequestError { status, code, message, details }`; network failure → `code: 'NETWORK'`.
- The browser only hits same-origin `/api/*`; `next.config.ts` rewrites to `API_URL`. Auth is the httpOnly `grm_token` cookie — no tokens in JS.
- Reads: `useSWR<T>(key)` where **the key is the API path** (global fetcher in `app/providers.tsx`). Build keys with `withQuery(path, {...})` (drops empty values, merges with existing query).
- Polling: `{ refreshInterval: REFRESH_MS }` (30 s) from `@/lib/swr`. No websockets — product requirement.
- After a mutation: `await revalidate('/users', '/alerts')` (prefix match on SWR keys). On logout: `clearCache()`.
- Types come from `@grm/shared` (`UserDto`, `PcsResponse`, `Paginated<T>`, …). If the API shape changes, update `packages/shared/src/types.ts` first.

## Auth / routing

- `/admin/*` and `/me/*` are gated twice: `proxy.ts` (cookie present) and the layout's `useRequireRole('admin' | 'user')` (`components/auth-gate.tsx`). New admin pages go under `app/admin/` and inherit the gate, nav and `AlertPoller` automatically — add a nav item in `app/admin/layout.tsx` if needed.
- Dynamic params: `useParams<{ id: string }>()`. `useSearchParams()` must be inside `<Suspense>` (see `app/reset-password/page.tsx`).

## i18n

- Every visible string goes through `const { t, lang, errText } = useI18n()`.
- Add keys to **both** `ka` and `en` in `lib/messages.ts` (`en` is typed `Record<MessageKey, string>` — a missing key fails typecheck). Placeholders: `t('users.deleteConfirm', { name })`.
- Error display: `errText(err)` — maps API `code` via `errorMessage()` in `packages/shared/src/i18n.ts`. New API error codes need translations there.
- Enum labels: `transactionTypeLabels`, `endReasonLabels`, `alertTypeLabels` from `@grm/shared`.

## Formatting

- Balances/durations are **seconds**. Display with `formatDuration(seconds, lang)` ("1 სთ 30 წთ"), `formatClock(seconds)` ("01:30:00"), `secondsToHours(seconds)` (1.5). Admin input is hours → send `hours` / `balanceHours`; parse user text with `parseHours()` (accepts `1,5`).
- Dates: `formatDateTime`, `formatTime`, `relativeTime`, `formatDateLabel` from `@/lib/format`. Date inputs use `toYmd()` (local date).
- CSV: `downloadCsv(filename, rows)` (UTF-8 BOM for Excel).
- `cn(...)` for conditional classes.

## Components (`components/ui.tsx`)

`Button` (variants primary/secondary/danger/warning/ghost, `loading`), `Input`/`Select`/`Checkbox`/`Field`, `FormError`, `Card` (title + actions), `PageHeader`, `StatCard`, `Badge`, `StatusDot`, `Table`/`Th`/`Td`, `Pagination`, `Segmented`, `Loading`, `Empty`, `Modal`, `ConfirmModal`.

- **Never** use `window.alert/confirm/prompt`. Destructive actions → `ConfirmModal` whose `onConfirm` may throw (error is shown inside the modal).
- Feedback → `useToast().success(...)` / `.error(...)` (`components/toast.tsx`).
- Reusable history: `TransactionsCard path=...`, `SessionsCard path=... showUser` (`components/history-tables.tsx`).
- `Table` takes `minWidth` (default 640) — lower it for half-width cards, raise it for wide tables (games uses 900).
- Games catalog (`app/admin/games`): `GameFormModal` shows only the fields for the chosen `launchType` and sends irrelevant ones as `null`; `GameThumb` renders `imageUrl` via plain `<img>` (arbitrary hosts, no next/image config) and falls back to a gradient tile with initials. `GET /games` returns a plain array, not `Paginated`.
- Intl has no Georgian data in most browsers — format ka dates/relative times explicitly (see `formatDateLabel`, `relativeTime`).

## Style

Dark theme: `zinc-950` background, cards `border-zinc-800 bg-zinc-900/60 rounded-2xl`, accent violet/cyan, `tabular-nums` for numbers/time. Keep layouts responsive (`grid-cols-2 md:grid-cols-4`, tables scroll horizontally).

## Verify

```bash
npm run build -w @grm/web      # also typechecks
npm run typecheck -w @grm/web
```
