# დესკტოპ კლიენტი (Electron kiosk)

`apps/desktop` — მომხმარებლის მხარის full-screen აპ, რომელიც ყენდებ ყოველ PC-ზ (**სამიზნ: Windows 10/11 x64**, 10 PC). მომხმარებელი ლოგინდებ, ხედავს დარჩენილ დრო, დრო ითვლებ უკუ, და **სიიდან უშვებ თამაშებ** (Steam, CS2, Dota 2, PUBG, League of Legends…). ადმინის ფუნქციებ აქ **არ არის** (ისინი ვებშ).

## თამაშების launcher

### ბიბლიოთეკ

- სია მოდის API-დან `GET /api/desktop/games?pcNumber=N` (x-pc-key + session token) — **მხოლოდ login-ის / სესიის აღდგენის მომენტშ** (მოვლენ, არა polling; heartbeat-ის ≤ 1/წთ წესი არ იცვლებ).
- ბოლ სია ინახებ `games.json`-ში (userData) — რესტარტის შემდეგ ან offline რეჟიმში თამაშების **გათიშვა** ისევ მუშავს.
- სესიის ეკრან: მარცხნივ countdown, მარჯვნივ თამაშების ბადე (სურათ `imageUrl`, ან gradient + ინიციალებ). კლიკ → გაშვებ.
- თამაშების სია/პარამეტრებ იმართებ ვებ-ადმინიდან.

### გაშვებ (მხოლოდ აქტიური სესიის დროს)

| ტიპ | ქმედებ |
|---|---|
| `STEAM` | `steam://rungameid/<steamAppId>` (Steam-ი თავად გაიხსნებ, თუ დაინსტალირებულია) |
| `URL` | ბმული OS-ის protocol handler-ით (მაგ. `com.epicgames.launcher://apps/Fortnite?action=launch&silent=true`); `file:`/`javascript:` აკრძალულია |
| `EXE` | ფაილის შემოწმებ (არ არის → „თამაში ამ კომპიუტერზ არ არის დაინსტალირებულ“), მერ `spawn(exePath, args)` detached, cwd = exe-ს საქაღალდ. args-ში ბრჭყალებ (`"..."`) მხარდაჭერილია |

Windows-ის გარდ სხვა OS-ზე (dev Mac) გაშვება **dry-run**: ლოგ `[games] DRY-RUN launch …` + შეტყობინებ. რეალური გაშვებ non-Windows-ზ: `GRM_REAL_LAUNCH=1`.

### Mini widget

წარმატებულ გაშვების შემდეგ იგივე ფანჯარ kiosk/fullscreen-იდან გადადის **პატარა ზოლშ** (~360×110) ეკრანის ზედა მარჯვენ კუთხშ (primary display-ის work area):

- ყოველთვ თავზ (`screen-saver` level), taskbar-ში არ ჩანს, **ფოკუს არ ართმევს** თამაშ (kiosk-ის „blur → focus“ წესი mini რეჟიმში გამორთულია);
- აჩვენებ: countdown, მომხმარებლ, PC, ღილაკებ **„თამაშებ“** (ბიბლიოთეკაზე დაბრუნებ full screen-ზ; თამაში გრძელდ) და **„გამოსვლ“** (2 დაჭერ);
- 5 წთ / 1 წთ დარჩენისას widget ციმციმებ (ყვითელ/წითელ) + beep.

> ⚠️ **Exclusive fullscreen** რეჟიმში თამაში შეიძლება widget-ს გადაფარ. თამაშებ ჩართეთ **Borderless / Windowed fullscreen** რეჟიმშ (CS2, Dota 2, PUBG, LoL, Valorant — ყველ აქვს ეს ოფცია) — მაშინ countdown ყოველთვ ჩანს. გადაფარვის შემთხვევაშიც 0-ზე თამაში გაითიშვებ (ქვემოთ).

### ადმინის PC-ბარათზე — რომელი თამაშ

Heartbeat-ის body-ში გადაიცემ `currentGame` (ბოლ გაშვებული თამაშის სახელ, ≤ 100 სიმბოლ) — **მხოლოდ აქტიური სესიის დროს**; ნებისმიერ დასრულებ/lock-ზე ნულდებ. გაშვებ **ცალკე heartbeat-ს არ იწვევ** — სახელ ადმინის ბარათზე ჩნდებ მომდევნ ჩვეულებრივ heartbeat-ის შემდეგ (≤ 60 წმ). Mini widget-ში ჩანს `▶ <თამაშ>`.

### სესიის დასრულებ → თამაშების გათიშვ

ნებისმიერ დასრულებისას (დრო ამოიწურ, გამოსვლ, ადმინის LOGOUT/SHUTDOWN, სერვერზე ENDED, offline lock, invalid session):

1. **ჯერ** — ყველ ცნობილ პროცესის გათიშვ: `taskkill /F /T /IM <name> …` — `processNames`-ების გაერთიანებ (ბოლ API სია + `games.json`). „not found“ შეცდომებ იგნორირდ.
2. **მერ** — ფანჯარ ბრუნდებ fullscreen kiosk-ზ + ფოკუს.
3. ჩვეულებრივ lock / „დრო ამოიწურ“ ეკრანებ.

აპის სტარტზ, თუ აქტიური სესია არ არის (მაგ. წინა სესიის დროს აპ „ჩამოვარდ“), იგივე kill სრულდებ. Non-Windows-ზ kill — dry-run ლოგ.

> Steam-ის `steam.exe` / `steamwebhelper.exe` და Riot/Epic launcher-ებ სიაშ — სესიის ბოლ ისინიც ითიშვებ, რომ შემდეგ მომხმარებელ არ დახვდეს სხვის შესულ ანგარიშ. Steam/Riot/Epic-ში **„Remember me“ გამორთვ** ან shared საკაფე ანგარიშებ ადმინის გადასწყვეტ.

## ინსტალაცი

### Build

```bash
npm run build -w @grm/desktop        # out/ (main, preload, renderer)
npm run dist:win -w @grm/desktop     # Windows installer → apps/desktop/release/GameRoomClient-Setup-<ver>.exe
npm run dist -w @grm/desktop         # მიმდინარე OS-ისთვ (mac dmg / linux AppImage)
```

Windows installer-ის build სჟობს Windows მანქანაზ (ან CI-ში, მაგ. GitHub Actions `windows-latest`). Installer ყენებ **ყველ მომხმარებლისთვ** (per-machine, NSIS x64), ქმნის Desktop/Start Menu shortcut-ებ, აპი ყენდებ autoStart-ზ.

**Apple Silicon Mac-იდან `dist:win`** (შემოწმდ 2026-09-15): `release/win-unpacked/GameRoomClient.exe` (x64 app, `app.asar`) **იქმნებ**, მაგრამ installer-ის ბოლ ნაბადი ვარდებ — electron-builder-ის `makensis` x86_64 binary-ა და Rosetta-ს გარეშ არ ეშვებ (`spawn Unknown system error -86`). ვარიანტებ:

1. Build Windows-ზ / CI-ში (რეკომენდირებულ);
2. Mac-ზ: `softwareupdate --install-rosetta --agree-to-license`, მერ ხელახლ `npm run dist:win -w @grm/desktop`;
3. სწრაფ ტესტისთვ: `release/win-unpacked/` საქაღალდ დააკოპირეთ Windows PC-ზე და გაუშვეთ `GameRoomClient.exe` (installer-ის გარეშ, autoStart არ ჩაირთვებ).

`electron-builder.yml`-ში `electronVersion` ფიქსირებულია (electron workspace root-ზ hoist-ებ) — electron-ის განახლებისას ეს ვერსიაც შეცვალეთ.

### PC-ზ

1. გაუშვეთ installer.
2. პირველ გაშვებისას ავტომატურ იხსნებ **პარამეტრებ** (ავტორიზაციის გარეშ, რადგან კონფიგურაცია ცარიელია).
3. შეიყვანეთ:
   - **API URL** — მაგ. `https://gameroom.ge` ან `http://192.168.1.10:4000` (`/api` სუფიქს არ არის აუცილებელ).
   - **PC-ის ნომერ** — 1–10 (უნდ ემთხვეოდ ვებზე PC-ების სიას).
   - **PC გასაღებ** — API-ს `.env`-ის `PC_AGENT_KEY`.
4. „კავშირის შემოწმებ“ → „შენახვ“. ვებ-დაშბორდზე PC ≤ 60 წმ-ში გახდებ „ონლაინ“.

## პარამეტრებ

| ველ | default | აღწერ |
|---|---|---|
| `apiUrl` | — | სერვერის მისამარ |
| `pcNumber` | — | 1–10 |
| `pcKey` | — | `PC_AGENT_KEY` |
| `language` | `ka` | `ka` / `en` |
| `shutdownOnExpire` | `true` | დროს ამოწურვისას PC-ის გათიშვ |
| `shutdownDelaySeconds` | `30` | „დრო ამოიწურ“ ეკრანის ხანგრძლივობ გათიშვამდ/ჩაკეტვამდ (5–600) |
| `autoStart` | `true` | აპის ავტოგაშვებ OS-ში შესვლისას (მხოლოდ packaged build) |

**გახსნ:** lock-ეკრანზ ⚙ ღილაკ (ქვედა მარჯვენ კუთხ) ან `Ctrl+Shift+S`. თუ PC უკვე კონფიგურირებულია, საჭიროა **ადმინის ელ. ფოსტ + პაროლ** (მოწმდებ `POST /api/desktop/verify-admin`-ით; განბლოკვ 5 წუთ). აქტიური სესიის დროს პარამეტრებ არ იხსნებ. იქვეა „აპლიკაციდან გამოსვლ“ (kiosk-იდან გასვლის ერთადერთი გზ).

**ფაილებ** (`app.getPath('userData')`):

| OS | საქაღალდ |
|---|---|
| Windows | `%APPDATA%\Game Room Client\` |
| macOS | `~/Library/Application Support/Game Room Client/` |
| Linux | `~/.config/Game Room Client/` |

- `config.json` — პარამეტრებ (აღდგენ: ფაილის რედაქტირებ/წაშლ, თუ API მიუწვდომელია და settings-ზე შესვლა შეუძლებელია).
- `session.json` — აქტიური სესიის token (აპის რესტარტისას სესია გრძელდ).
- `games.json` — ბოლ მიღებული თამაშების სია (offline / რესტარტის შემდეგ პროცესების გათიშვისთვ).

**Env overrides** (dev/ტესტ): `GRM_API_URL`, `GRM_PC_NUMBER`, `GRM_PC_KEY` — ჩანაცვლებენ შენახულ მნიშნელობებ (settings ეკრან ამას აჩვენებ).

## ქცევის ვადებ (timeline)

```
აპის სტარტ ──► heartbeat დაუყოვნებლივ, მერ ყოველ 60 წმ (ყოველთვ, idle-შიც)
                  │
login ───────────► POST /desktop/login → token, balance
                  │  ეკრან: countdown HH:MM:SS (ლოკალურ, ყოველ წამ)
                  │  heartbeat ყოველ 60 წმ → სერვერი ჩამოჭრის, აბრუნებ ზუსტ ბალანს
                  │
დარჩა 5 წთ ──────► ყვითელი toast + 2 beep
დარჩა 1 წთ ──────► წითელი toast + 3 beep, მოციმციმე countdown
                  │
0 ───────────────► ეკრანი ჩაიკეტებ მომენტალურ („დრო ამოიწურ“)
                  │  POST /desktop/logout {reason: EXPIRED} (ერთხელ) → ვებზ BALANCE_DEPLETED ალერტ
                  │  shutdownDelaySeconds (30) წამ countdown
                  └► shutdownOnExpire ? PC გაითიშვებ : login ეკრან
```

| მოვლენ | ქცევ |
|---|---|
| „გამოსვლ“ (2 დაჭერ) | ეკრანი ჩაიკეტებ მომენტალურ, `logout USER` |
| heartbeat: სესია `ENDED` (მაგ. ადმინმ ბალანს 0 გახად) | `BALANCE_DEPLETED` → „დრო ამოიწურ“ flow; სხვა მიზეზ → შეტყობინებ + lock |
| heartbeat: `command = LOGOUT` | შეტყობინებ „ადმინისტრატორმ დაასრულ…“ + lock |
| heartbeat: `command = SHUTDOWN` | 10 წმ countdown → PC-ის გათიშვ |
| heartbeat: `sessionError` | „სესია ვადაგასულია“ + lock |
| EXPIRED logout-ზ სერვერი აბრუნებ ბალანს > 60 წმ | (ადმინმ ბოლ წუთში შეივს) — გათიშვა **არ** ხდებ, „ბალანსი შეივს — შედით ხელახლ“ |
| API მიუწვდომელია | ბანერი „კავშირი დაკარგულია“; 180 წმ-ის შემდეგ სესია ჩაიკეტებ ლოკალურ (სერვერი ხურავს `TIMEOUT`-ით) |
| აპის რესტარტი სესიის დროს | `session.json`-დან token → პირველ heartbeat აღადგენ სესიას |

API-ს გამოძახებ: heartbeat **≤ 1/წთ**; login/logout — მხოლოდ მომხმარებლის მოვლენებ. სოკეტ არ გამოიყენებ. დეტალებ: [billing.md](billing.md).

## Full screen (100% × 100%) და kiosk

**ყველ build-ში (dev-ის ჩათვლ) default = full screen kiosk**:

- ფანჯარ ზუსტ ემთხვევ **primary display-ის bounds**-ს (არა work area — Windows taskbar-ი გადაფარულია); `kiosk`, `fullscreen`, `alwaysOnTop` (`screen-saver` level), frame/shadow არ არ;
- **ზომის/პოზიციის შეცვლა შეუძლებელია**: `resizable`/`movable`/`minimizable`/`maximizable` = false; `will-resize` / `will-move` ბლოკდ; fullscreen-იდან გასვლ, minimize, maximize/unmaximize → bounds ხელახლ; ეკრანის რეზოლუციის/მონიტორის ცვლილებ (`display-metrics-changed`, `display-added/removed`) → ხელახლ 100%;
- **Zoom ბლოკდ**: Ctrl +/−/0, Ctrl+wheel (`zoom-changed` → 1), pinch (`setVisualZoomLevelLimits(1,1)`, `--disable-pinch`);
- UI: `html/body/#root = 100vw × 100vh`, overflow hidden, scrollbar-ებ დამალულ, ტექსტის მონიშნვ მხოლოდ input-ებშ, drag regions არ არ. ზომებ `rem`-შ, root font-size = `clamp(12px, 0.55vw + 0.55vh, 32px)` → layout მასშტაბირდ 1366×768-დან 4K-მდ;
- macOS-ზ (dev) native fullscreen-ი თავად განსაზღვრავს frame-ს (notch/menu bar-ის ზოლი შეიძლება გამოირიცხოს); Windows/Linux-ზ bounds მიმაგრდ ზუსტ display-ზ;
- Mini widget (თამაშის დროს) — ასევ **ფიქსირებული** 360×110, არ იცვლებ ზომ/პოზიცია; ბიბლიოთეკაზე/lock-ზე დაბრუნებისას — ისევ ზუსტ 100% bounds.

სხვ: მენიუ/devtools გამორთულ (packaged), close ბლოკდ, Alt+F4 / Ctrl+W / Ctrl+Q / Ctrl+R / F5 / F11 / F12 ბლოკდ, ფოკუს დაკარგვისას ბრუნდებ (full რეჟიმშ), navigation/popup ბლოკდ, single-instance.

> ⚠️ Electron **არ შეუძლია** OS-ის დონის კომბინაციების ბლოკვ: `Ctrl+Alt+Del`, `Win` ღილაკ, `Alt+Tab` (ნაწილობრივ), Task Manager. რეალური lockdown-ისთვ Windows-ზ:
>
> - **Assigned Access / Kiosk mode** (Windows 10/11 Pro/Enterprise): Settings → Accounts → Other users → Set up a kiosk — ცალკე local user, რომელიც ხედავს მხოლოდ ამ აპ; ან
> - **Shell replacement** — ცალკე user-ისთვ `HKCU\Software\Microsoft\Windows NT\CurrentVersion\Winlogon\Shell` = აპის .exe (Explorer-ის ნაცვლად), ან Shell Launcher (Enterprise);
> - Group Policy: Task Manager-ის, Lock/Switch user-ის, Ctrl+Alt+Del ოფციების გამორთვ; USB/Run dialog შეზღუდვ;
> - ადმინ-ანგარიშ ცალკე, პაროლით.

Dev-ში ჩვეულებრივი ფანჯარ **მხოლოდ** explicit opt-out-ით: `GRM_WINDOWED=1` (packaged build-ში იგნორირდ).

## PC-ის გათიშვ

| OS | ბრძანებ | უფლებებ |
|---|---|---|
| Windows | `shutdown /s /f /t 0` | ჩვეულებრივ user-ს აქვს „Shut down the system“ უფლება (Local Security Policy → User Rights Assignment). kiosk user-ზე შეამოწმეთ. |
| macOS | `osascript -e 'tell application "System Events" to shut down'` | პირველ ჯერ macOS მოითხოვს Automation („System Events“) ნებართვ; ღია აპებ შეიძლება შეაჩერონ. |
| Linux | `systemctl poweroff` | polkit-ზე დამოკიდებულ; აქტიური local session-ზ ჩვეულებრივ ok, სხვა შემთხვევაში polkit rule. |

**უსაფრთხოებ:** unpackaged (dev) build-ში გათიშვ **არასდროს** სრულდებ — მხოლოდ ლოგ `[power] DRY-RUN shutdown` და შეტყობინებ UI-ზ. რეალური ტესტ dev-იდან: `GRM_REAL_SHUTDOWN=1` (ფრთხილ — გაითიშვებ თქვენ კომპიუტერ).

Shutdown-ის შეცდომის შემთხვევაში (უფლებ არ არ) UI აჩვენებ „გათიშვა ვერ მოხერხდ“ და ბრუნდებ login ეკრანზ.

## Development

```bash
# API უნდ ყოს გაშვებულ (npm run dev:api)
GRM_WINDOWED=1 GRM_API_URL=http://localhost:4000 GRM_PC_NUMBER=2 GRM_PC_KEY=dev-pc-key npm run dev:desktop
```

`GRM_WINDOWED=1`-ის გარეშ dev-იც full screen kiosk-ში გაიხსნებ (გასვლ: settings → „აპლიკაციდან გამოსვლ“).

Dev-only test hook-ებ (packaged build-ში იგნორირდ):

| env | ქმედებ |
|---|---|
| `GRM_WINDOWED=1` | ჩვეულებრივი ფანჯარ ნაცვლად full screen kiosk-ის |
| `GRM_AUTOLOGIN='email:password'` | ავტომატური login პირველ წარმატებულ heartbeat-ის შემდეგ |
| `GRM_AUTOLAUNCH='Dota 2'` (სახელ ან id) | ბიბლიოთეკის ჩამოტვირთვის შემდეგ ავტომატურ გაშვებ |
| `GRM_REAL_LAUNCH=1` | non-Windows-ზ რეალური გაშვებ (default: dry-run) |
| `GRM_REAL_SHUTDOWN=1` | dev build-ში რეალური გათიშვ (⚠️) |

არქიტექტურ და ინვარიანტებ: `.claude/skills/desktop-client/SKILL.md`.
