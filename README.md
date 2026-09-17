# 🎮 Game Room Manage

გეიმ რუმის / ინტერნეტ კაფეს მართვის სისტემ: მომხმარებლებ ყიდულობენ **დრო** (საათებ), PC-ზე kiosk აპლიკაცია ითვლ და ჩამოჭრ.

| | |
|---|---|
| **API** | NestJS 11 · Prisma 6 · PostgreSQL — `apps/api` |
| **Web** (ადმინ + მომხმარებელ) | Next.js 16 · Tailwind 4 — `apps/web` |
| **Desktop** (PC kiosk) | Electron · React — `apps/desktop` |
| **Shared** | ტიპებ, თარგმანებ, ფორმატირებ — `packages/shared` |

## შესაძლებლობებ

**ადმინ (ვებ):** ლოგინ წინასწარ განსაზღვრული კრედენშიალებით · მომხმარებლების CRUD · ბალანსის (საათებ) შევსებ/ჩამოჭრ/დაყენებ · PC-ების სტატუს (online/offline, ვინ ზის, რამდენი დარჩ) · PC-ზე LOGOUT/SHUTDOWN ბრძანებ · ალერტებ (ბალანსი ამოიწურ / იწურებ) toast + ხმ · რეპორტებ თარიღის ჭრილში + CSV.

**მომხმარებელ (ვებ):** ლოგინ (email/ტელეფონ) · პროფილ: დარჩენილი ბალანს, ისტორი, სესიებ · პაროლის შეცვლ/აღდგენ.

**Desktop (Windows PC):** 100%×100% full-screen kiosk (ზომა არ იცვლებ) · ლოგინ → countdown → ბალანს აკლდებ · **თამაშების ბიბლიოთეკ** (Steam, CS2, Dota 2, PUBG, LoL …) — თამაშის დროს პატარა ტაიმერ-ვიჯეტ, სესიის ბოლ თამაში ითიშვებ · გამოსვლ · heartbeat **1 წუთში ერთხელ** (არა socket) · 5/1 წთ გაფრთხილებ, 0-ზე ალერტ · PC-ის გათიშვ · Settings: PC ნომერ 1–10, API URL, PC key.

**ადმინ — PC-ებ და თამაშებ:** ლამაზ „სადგურ“-ბარათებ (სტატუს, მომხმარებელ, მიმდინარე თამაშ, live countdown) · თამაშების კატალოგის მართვ `/admin/games`.

## სწრაფი სტარტ (local)

```bash
# 0. მოთხოვნებ: Node ≥ 22.12, PostgreSQL ≥ 14
npm install
node node_modules/electron/install.js   # თუ node_modules/electron/dist არ ჩან (npm 11 allowScripts)

# 1. DB + env
createdb game_room && createdb game_room_test
cp apps/api/.env.example apps/api/.env        # DATABASE_URL, JWT_SECRET, PC_AGENT_KEY
cp apps/web/.env.example apps/web/.env.local
npm run db:migrate
npm run db:seed-demo                           # (სურვილისამებრ) demo მომხმარებლებ, პაროლ demo123

# 2. გაშვებ
npm run dev            # API :4000 + Web :3000
GRM_WINDOWED=1 npm run dev:desktop    # Electron; GRM_WINDOWED=1 გარეშ — 100% full screen kiosk (shutdown dev-ში = dry-run)
```

- ვებ: http://localhost:3000 — ადმინ `admin@gameroom.local` / `Admin12345` (`apps/api/.env`)
- Desktop settings: API `http://localhost:4000`, PC key = `PC_AGENT_KEY`

## ტესტებ

```bash
npm test               # API e2e: ბილინგ, ალერტებ, ბრძანებ, პაროლებ, რეპორტებ
npm run typecheck
```

## დოკუმენტაცი

| ფაილ | შინაარს |
|---|---|
| [docs/requirements.md](docs/requirements.md) | მოთხოვნებ → რეალიზაცი |
| [docs/architecture.md](docs/architecture.md) | კომპონენტებ, მონაცემთა მოდელ, auth, polling |
| [docs/billing.md](docs/billing.md) | **დროის ჩამოჭრის ლოგიკ** და კიდურა შემთხვევებ |
| [docs/api.md](docs/api.md) | API reference |
| [docs/web.md](docs/web.md) | ვებ-აპის გვერდებ |
| [docs/desktop.md](docs/desktop.md) | Electron kiosk: settings, ქცევ, lockdown, build |
| [docs/deployment.md](docs/deployment.md) | Production deploy |
| [docs/migration.md](docs/migration.md) | ძველ სოფტიდან (SENET) იუზერების იმპორტ |

AI ასისტენტისთვ: [CLAUDE.md](CLAUDE.md) და `.claude/skills/`.
