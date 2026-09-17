# ვებ აპლიკაცია (`apps/web`)

Next.js 16 (App Router) + Tailwind 4 + SWR. ყველ გვერდი client component-ია; მონაცემები მოდის API-დან `/api/*` გზით.

## არქიტექტურ

```
Browser ──► Next.js (:3000) ──rewrite /api/* ──► NestJS API (:4000)
```

- ბრაუზერი **მხოლოდ** ვებ origin-ს იძახის. `next.config.ts`-ის rewrite `/api/:path*`-ს გადაამისამართებ `API_URL`-ზ — ასე httpOnly cookie `grm_token` first-party-ა და CORS არ სჭირდებ.
- `proxy.ts` (Next 16-ში middleware-ის ახლ სახელ): თუ `grm_token` cookie არ არის, `/admin/*` და `/me/*` → `/login?next=…`. ეს მხოლოდ „ოპტიმისტური“ შემოწმებაა.
- რეალური შემოწმ — `components/auth-gate.tsx`: `GET /api/auth/me`; 401 → `/login`, სხვა role → შესაბამისი home (`/admin` ან `/me`).

## Env

| ცვლად | Default | აღწერ |
|---|---|---|
| `API_URL` | `http://localhost:4000` | NestJS API-ს მისამართი (server-side; rewrite-ისთვ). `apps/web/.env.local` |

## გვერდებ

| გზ | Role | აღწერ |
|---|---|---|
| `/` | — | role-ის მიხედვით გადამისამართებ |
| `/login` | public | ტაბებ: **მომხმარებელ** (ელ. ფოსტ ან ტელეფონ) / **ადმინ** (ელ. ფოსტ) |
| `/forgot-password` | public | ელ. ფოსტზე აღდგენის ბმულ |
| `/reset-password?token=` | public | ახლ პაროლ |
| `/admin` | admin | დაშბორდ: ჯამური ბარათებ (სულ / ჩართული / დაკავებული / თავისუფალ / ბალანსი იწურებ / ღია ალერტებ) + PC-ების „დარბაზ“ (station ბარათებ, ფილტრებ) — იხ. „PC station ბარათებ“ |
| `/admin/users` | admin | სვეტებ: username, email, სახელ, ტელეფონ, ბალანს, რეგისტრაციის თარიღ, სტატუს; ძებნ (name/username/email/phone), სტატუსის ფილტრ, pagination, შექმნ (საწყისი ბალანსი საათებშ), რედაქტირებ, წაშლ (confirm modal) |
| `/admin/users/[id]` | admin | პროფილ, სტატისტიკ, აქტიური სესი, **ბალანსის მართვ** (დამატებ / ჩამოჭრ / ზუსტი; preset-ებ 0.5/1/2/3/5 სთ + შენიშვნ), ისტორი, სესიებ |
| `/admin/pcs` | admin | იგივე station ბარათებ + **ბარათებ / ცხრილ** გადამრთველ (არჩევანი ინახებ `localStorage`-შ); ქმედებ `⋯` მენიუდან: სახელის შეცვლ, „სესიის დასრულებ“ (`LOGOUT`), „გათიშვ“ (`SHUTDOWN`, confirm), ბრძანების გაუქმებ |
| `/admin/games` | admin | თამაშების კატალოგ PC-ებისთვ (Windows): სურათ, სახელ, ტიპ (`STEAM` / `EXE` / `URL`), გაშვების პარამეტრ, პროცესებ (სესიის ბოლოს დაიხურებ), აქტიური toggle, რიგ; შექმნ/რედაქტირებ (STEAM → „Steam-ის ყდ“ ღილაკ), წაშლ |
| `/admin/reports` | admin | თარიღების დიაპაზონ + preset-ებ (დღეს/გუშინ/7 დღე/ეს თვე); ჯამებ; დღეების/მომხმარებლების/PC-ების მიხედვით; სესიების სია; CSV ექსპორტ |
| `/admin/alerts` | admin | ღია / ყველ; დადასტურებ, ყველის დადასტურებ |
| `/me` | user | დარჩენილი ბალანსი (საათებ + `HH:MM:SS`), აქტიური სესი, პაროლის შეცვლ, ბალანსის ისტორი, სესიებ |

## Polling (სოკეტების გარეშ)

| რა | ინტერვალ |
|---|---|
| PC-ების სია (`/admin`, `/admin/pcs`) | 30 წმ |
| ღია ალერტებ (ადმინის layout — ყველ გვერდზ) | 30 წმ |
| მომხმარებლის დეტალ / `/me` | 30 წმ |

PC-ები სერვერთან სინქრონიზირდ 1 წუთში ერთხელ, ასე რომ PC-ის სტატუს/ბალანს შეიძლება ≤ 60 წმ ჩამორჩეს.

## PC station ბარათებ (`components/pc-room.tsx`)

| სტატუს | პირობ | ვიზუალ |
|---|---|---|
| გამორთულ | heartbeat > 150 წმ წინ, სესია არ არის | ნაცრისფერი, მკრთალ |
| თავისუფალ | ჩართულ, სესია არ არის | მწვანე ჩარჩ/glow |
| დაკავებულ | აქტიური სესი | იისფერ |
| ბალანსი იწურებ | დარჩ ≤ `lowBalanceThresholdSeconds` (API, default 300 წმ) | ყვითელ |
| დრო ამოიწურ | დარჩ ≤ 60 წმ | წითელი, pulse |

- **დაკავებული ბარათ:** avatar (ინიციალებ, ფერი სახელიდან), სახელ → `/admin/users/[id]`, გაშვებული თამაშ (`currentSession.game`; ყდ `GET /api/games`-დან, თუ სახელი ემთხვევ), დიდ countdown, progress bar (დარჩ / (დარჩ + გამოყენებულ)), დაწყ + გასული დრ. თუ PC-თან კავშირ გაწყდა, ჩნდებ „კავშირ არ არის“.
- **Countdown ლოკალურ:** `remaining = balanceSeconds − (serverNow − lastHeartbeatAt)`, ≥ 0; `serverNow = Date.now() + (serverTime − მიღების მომენტ)` — ბრაუზერის საათის შეცდომ არ მოქმედებ. ყოველ წამ ხდებ ხელახლა render, API-ს გამოძახების გარეშ.
- **თავისუფალ/გამორთული ბარათ:** ბოლ კავშირ, აპის ვერსი, IP.
- ზედ: ფილტრებ (ყველ / დაკავებულ / თავისუფალ / გამორთულ / ბალანსი იწურებ) რაოდენობებით, „განახლდ ყოველ 30 წმ · ბოლ განახლებ …“ და ხელით განახლების ღილაკ.
- Grid: 5 სვეტ (xl) → 4 → 3 → 2 (მობილურ).

## ალერტებ

`components/alert-poller.tsx` — admin layout-შ:

- პირველი ჩატვირთვისას არსებული ალერტები **მხოლოდ ითვლებ** (badge nav-შ).
- ახლ ალერტ (id > ბოლ ნანახ) → toast (`BALANCE_DEPLETED` — წითელ, რჩება დახურვამდ; `LOW_BALANCE` — ყვითელ, 15 წმ) + ხმოვანი სიგნალ (WebAudio) + browser notification (თუ header-ში „🔔“ ღილაკით ნებართვა მიცემულ).

## ენებ

ქართული (default) / English — header-ის გადამრთველ, ინახებ `localStorage`-შ (`grm_lang`). ტექსტებ: `apps/web/lib/messages.ts`; API error code-ების თარგმანებ: `packages/shared/src/i18n.ts`.

## Build / Run

```bash
npm run dev -w @grm/web        # :3000
npm run build -w @grm/web
npm run start -w @grm/web      # production
```
