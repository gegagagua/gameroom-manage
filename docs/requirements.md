# მოთხოვნებ (Requirements)

ორიგინალი აღწერა და თითოეული პუნქტის რეალიზაცი. ცვლილებ დაამატეთ ქვემოთ „ცვლილებების ჟურნალ“-ში.

## ტექნოლოგი

| მოთხოვნ | რეალიზაცი |
|---|---|
| Next.js | `apps/web` — Next.js 16 (App Router) + Tailwind 4 |
| Electron | `apps/desktop` — Electron + electron-vite + React |
| NestJS | `apps/api` — NestJS 11 + Prisma 6 |
| PostgreSQL | PostgreSQL 17 (≥ 14 სავსებით ok) |

## ვებ (ღრუბელზ) — ადმინ

| # | მოთხოვნ | სად |
|---|---|---|
| W1 | ავტორიზაცია **წინასწარ განსაზღვრული** ადმინის კრედენშიალებით | `.env` → `ADMIN_EMAIL` / `ADMIN_PASSWORD`; API-ს ყოველ გაშვებისას upsert (`SeedService`) |
| W2 | მომხმარებლების CRUD: სახელი, ელ. ფოსტა, ტელეფონი, პაროლი, ბალანს | `/admin/users`; API `GET/POST/PATCH/DELETE /api/users` |
| W3 | ბალანსის მართვა — **მხოლოდ ადმინ** | `POST /api/users/:id/balance` (`add` / `subtract` / `set`), `@Roles('admin')` |
| W4 | ბალანსი = საათებ (3, 1, 1.2 … 0) | UI-ში საათებ (ათწილადით); DB-ში **წამებ** (`balance_seconds`), რომ ყოველ წუთის ჩამოჭრა ზუსტი იყოს |
| W5 | ცალკე რეპორტი თარიღის ჭრილშ | `/admin/reports`; `GET /api/reports/summary?from&to`, `GET /api/reports/sessions` + CSV ექსპორტ |
| W6 | PC-ების სია, ჩართული/გამორთული სტატუს, ვინ იყენებს ახლა | `/admin` (დაშბორდ) და `/admin/pcs`; `GET /api/pcs` |
| W7 | 0 წუთის დროს ალერტი ვებზ | `alerts` ცხრილი; ადმინ-პანელი ყოველ 30 წმ-ში poll-ებ `GET /api/alerts?status=open` → toast + ხმ + browser notification |

## ვებ — მომხმარებელ

| # | მოთხოვნ | სად |
|---|---|---|
| U1 | მომხმარებლის ავტორიზაცი | `/login` (ელ. ფოსტ ან ტელეფონ) |
| U2 | პაროლის შეცვლ | `/me` → `POST /api/auth/change-password` |
| U3 | პაროლის აღდგენ | `/forgot-password` → ელ. ფოსტზე ბმული (SMTP; თუ SMTP არ არის — ბმული API-ს ლოგშ) → `/reset-password?token=` |
| U4 | პროფილი: დარჩენილი ბალანსი + ბალანსის ისტორი | `/me` — `GET /api/me`, `/api/me/transactions`, `/api/me/sessions` |

## დესკტოპ (Electron) — მხოლოდ მომხმარებლის მხარ

| # | მოთხოვნ | სად |
|---|---|---|
| D1 | Full-screen აპ, მომხმარებელი ლოგინდებ, ხედავს ბალანს | kiosk ფანჯარა (`apps/desktop/src/main`) |
| D2 | ლოგინისთანავე იწყებ უკუთვლა, ბალანსი (დრო) აკლდებ | ლოკალური countdown ყოველ წამ; სერვერი ჩამოჭრის რეალურ დროს ყოველ heartbeat-ზ |
| D3 | გამოსვლის ღილაკი — countdown ჩერდებ | `POST /api/desktop/logout` |
| D4 | **არა სოკეტი**, API-ს გამოძახება **1 წუთში ერთხელ** | `POST /api/desktop/heartbeat` ყოველ 60 წმ-ში (setTimeout, HTTP) |
| D5 | Settings-ში PC-ის ნომერი (1–10) | Settings ეკრანი (ადმინის კრედენშიალებით დაცულ) |
| D6 | ვებზე ჩანს რომელ PC-ზე რომელი მომხმარებელ | `GET /api/pcs` → `currentSession.user` |
| D7 | 0 წუთზე ალერტი მომხმარებელ | 5 წთ და 1 წთ დარჩენისას გაფრთხილებ, 0-ზე full-screen „დრო ამოიწურ“ |
| D8 | თუ შესაძლებელია — PC-ის გათიშვ | `shutdownOnExpire` პარამეტრ: 0-ზე N წამის შემდეგ OS shutdown (Windows/macOS/Linux). ადმინი ვებიდანაც შეუძლია `SHUTDOWN` / `LOGOUT` ბრძანებ |

## დამატებით (მოთხოვნაში არ ეწერ, მაგრამ საჭირ)

- ერთი მომხმარებელ — ერთ აქტიური სესია (სხვა PC-ზე შესვლა ბლოკდ).
- PC-ის აპის რესტარტ → სესია გრძელდ (resume), ორმაგი ჩამოჭრა არ ხდებ.
- PC-ი თუ კავშირს კარგავს > 3 წთ, სერვერი ხურავს სესიას (`TIMEOUT`), კლიენტი ლოკდ.
- PC-ების API დაცულია `PC_AGENT_KEY` საიდუმლ გასაღებით.
- მომხმარებლის წაშლა — soft delete (ისტორია და რეპორტებ რჩებ).
- UI ორ ენაზ: ქართული (default) / English.

## დამატებით მოთხოვნ (2026-09-14, მეორ შეტყობინებ)

> „აპპ ფულლ სქრინი უნდა იყოს და 10 ივე ვინდოუსი იქნება, ასევე არის შესაძლებელი თამაშის + სტიმის გამოძახება? სია რომ გავაკეთოთ თამაშების…: cs go 2, dota 2, pubg, League of legend…“

| # | მოთხოვნ | რეალიზაცი |
|---|---|---|
| G1 | ყველ 10 PC — Windows, აპ full screen | packaged build: kiosk + fullscreen (taskbar-ის ზემოთ), NSIS x64 installer, autoStart |
| G2 | თამაშებ + Steam-ის გაშვებ სიიდან | ადმინ მართავს კატალოგ `/admin/games`; launch type `STEAM` (`steam://rungameid/<appId>`), `EXE` (მაგ. Riot Client), `URL` (მაგ. Epic) |
| G3 | სიაში CS2, Dota 2, PUBG, LoL … | default კატალოგ ივსებ ავტომატურ (Steam, CS2, Dota 2, PUBG, LoL, VALORANT, Fortnite) |
| G4 | (ლოგიკურ დამატებ) თამაშის დროს ტაიმერი ჩანდეს, სესიის ბოლ თამაში გაითიშოს | გაშვების შემდეგ kiosk ფანჯარა → პატარა always-on-top ტაიმერ-ვიჯეტ; სესიის ბოლ `taskkill` `processNames`-ით → ისევ full screen lock |
| G5 | „ყველა ფუნქცია დაასრულე, ადმინში PC-ებ ლამაზად“ | `/admin` და `/admin/pcs` — სადგურ-ბარათებ: სტატუსის glow, მომხმარებლის avatar, **მიმდინარე თამაშ** (desktop heartbeat-ის `currentGame`), live countdown, progress bar, ფილტრებ, სწრაფ ქმედებ |
| G6 | „სრულ სქრინზე 100%/100%, ზომა ვერ უნდა შეცვალონ“ | kiosk ფანჯარა = primary display-ის ზუსტ bounds (taskbar-ის ზემოთ), resizable/movable/minimizable გამორთულ, resize/move/zoom ბლოკ, რეზოლუციის შეცვლისას თავიდან მორგებ; ყველ build-ში default. Dev-ში ფანჯარ მხოლოდ `GRM_WINDOWED=1` |

## ცვლილებების ჟურნალ

- 2026-09-14 — v1.0 პირველი ვერსი.
- 2026-09-14 — v1.1 თამაშების კატალოგ და launcher (G1–G4); `/api/pcs` აბრუნებ `lowBalanceThresholdSeconds`.
