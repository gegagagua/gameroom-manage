---
name: desktop-client
description: Internals, invariants and run/package workflow of the Electron kiosk client in apps/desktop. Use when changing the desktop app (session state machine, heartbeat, countdown, shutdown, settings, kiosk window) or when building/packaging it.
---

# Desktop kiosk client (apps/desktop)

Customer-only full-screen client for game room PCs (**target: Windows 10/11 x64**) with a game launcher. Electron 44 + electron-vite 5 (Vite 7) + React 19. User-facing docs (Georgian): `docs/desktop.md`. API contract: `docs/api.md` → `/desktop/*`. Billing rules: `docs/billing.md`.

## Layout

```
electron.vite.config.ts      main/preload/renderer; @grm/shared excluded from externalizeDeps (it is TS source → must be bundled)
electron-builder.yml         nsis per-machine (win), dmg, AppImage → release/
src/common/ipc.ts            IPC channel names, AppState, DesktopConfig, GrmBridge (shared by all 3 processes)
src/main/index.ts            window creation + kiosk lock rules (resize/move/zoom/focus), display events, IPC, autoStart
src/main/window-mode.ts      WindowController: full (100% primary display bounds) ⇄ mini (fixed 360×110 widget); enforce()
src/main/session-manager.ts  THE state machine: heartbeat loop, timers, commands, expiry, games, settings gating
src/main/games.ts            launch (STEAM/URL/EXE, dry-run off Windows), taskkill, games.json cache, parseArgs
src/main/api-client.ts       fetch → /api/desktop/* (heartbeat, login, logout, games, verify-admin), ApiRequestError{code,status,details}
src/main/config-store.ts     userData/config.json (+ GRM_* env overrides), userData/session.json (token)
src/main/power.ts            OS shutdown with DRY-RUN guard
src/preload/index.ts         contextBridge → window.grm (sandboxed, CJS output)
src/renderer/src/            App, screens/{Login,Session,GameLibrary,MiniWidget,Settings,Overlays,TopBar}, i18n (ka/en), hooks
```

All networking and timers live in **main**. The renderer is display-only: it renders `AppState` pushed on `grm:state` and calls `window.grm.*`. contextIsolation on, nodeIntegration off, sandbox on.

## State machine (`AppState.phase`)

```
unconfigured ──save valid settings──► idle
idle ──login ok──► active
idle (saved token) ──first heartbeat: ACTIVE──► active        (resume after restart)
active ──logout button──► idle                                (logout USER, best effort)
active ──local countdown 0──► expired ──(logout EXPIRED once)──► after shutdownDelaySeconds:
                                  shutdownOnExpire ? shutdown (dry-run → idle) : idle
        └─ EXPIRED response balance > 60 s (admin topped up) ──► message(TOPPED_UP)
active ──heartbeat session ENDED/BALANCE_DEPLETED──► expired (no logout call)
active ──heartbeat session ENDED (other reason)──► message(ENDED, reason)
active ──heartbeat sessionError──► message(SESSION_INVALID)
any    ──heartbeat command LOGOUT (had session)──► message(COMMAND_LOGOUT)
any    ──heartbeat command SHUTDOWN──► message(COMMAND_SHUTDOWN) ──10 s──► shutdown
active ──no successful heartbeat ≥ 180 s──► message(OFFLINE)
message ──15 s or OK button──► idle
```

Window mode (`AppState.windowMode`) is orthogonal: `full` everywhere, `mini` only while `phase === 'active'` after a successful launch ("Games" button → back to `full`, game keeps running). Every session end calls `endGamesAndRestore()`: taskkill FIRST, then `setWindowMode('full')`, and resets `currentGame`.

The countdown shown = `balanceSeconds - (now - balanceSyncedAt)/1000`; every heartbeat response re-syncs it and re-arms expiry + warning timers (5 min, 1 min).

## Invariants — do not break

1. **Polling only, ≤ 1 call/minute.** A single `setTimeout` chain (`scheduleHeartbeat`) at `heartbeatIntervalSeconds` (server-provided, 60), idle included. No sockets, no fast retries on failure. Extra calls happen only on user/lifecycle events: login, logout, one EXPIRED logout, settings test/save, app start.
2. **Shutdown dry-run guard.** `power.ts#isShutdownDryRun()` returns true whenever `!app.isPackaged` unless `GRM_REAL_SHUTDOWN=1`. Never remove or invert it; running dev builds must never power off the developer machine. Test the command path with `LOGOUT`, not `SHUTDOWN`, unless the guard is verified.
3. The server is the source of truth for balance; the client never computes charges, it only displays and locks early at local zero.
4. Lock first, call the API second (logout/expire): the screen must lock even if the network is down.
5. Ignore a heartbeat's session payload if the token changed while the request was in flight (`token === this.token` check).
6. Settings IPC (`getSettings/testSettings/saveSettings/quit`) is gated in main by `isSettingsUnlocked()` (unconfigured, or admin verified via `/desktop/verify-admin` within 5 min). Settings can't be saved during `active`/`expired`.
7. `setTimeout` delays are capped (`MAX_TIMER_MS`) — balances can exceed the 24.8-day timer limit.
8. Dev-only hooks (`GRM_WINDOWED`, `GRM_AUTOLOGIN`, `GRM_AUTOLAUNCH`) must stay behind `isDev` / `!app.isPackaged`.
9. All UI strings exist in both `ka` and `en` in `src/renderer/src/i18n.ts`; API error codes are translated through `@grm/shared` `errorMessage`.
10. **Full screen is the default in every build**: window = exact primary display bounds (covers the taskbar), not resizable/movable/minimizable/maximizable, zoom locked; all OS attempts (`will-resize`, `will-move`, leave-full-screen, (un)maximize, minimize, display changes) re-apply geometry via `WindowController.enforce()`. Only `GRM_WINDOWED=1` in unpackaged builds opts out. The mini widget is fixed-size too.
11. **Games**: library is fetched only on login/resume (never polled) and cached to `games.json`; launch only in `active`; renderer passes only a game id. Launch is dry-run unless `process.platform === 'win32'` or `GRM_REAL_LAUNCH=1`; kill is dry-run off Windows. On app start without a session → kill leftovers.
12. `currentGame` is sent inside the regular heartbeat only while active — launching must NOT trigger an extra heartbeat.

## Run

```bash
npm run dev:api                                   # API on :4000 (seeded PCs 1..10, key dev-pc-key)
GRM_WINDOWED=1 GRM_API_URL=http://localhost:4000 GRM_PC_NUMBER=2 GRM_PC_KEY=dev-pc-key npm run dev:desktop
# optional: GRM_AUTOLOGIN='user@example.com:secret1' GRM_AUTOLAUNCH='Dota 2'
# without GRM_WINDOWED the dev build opens as a full-screen kiosk — quit via Settings, or pkill -f Electron.app from a terminal
```

Logs to grep: `[games] DRY-RUN launch|kill`, `[window] mode=… bounds=…`, `[dev] auto-launch`.

Verify from the API side: admin login → `GET /api/pcs` → PC online, `currentSession.user`, `currentGame` (appears after the next regular heartbeat). Admin command: `POST /api/pcs/:id/command {"command":"LOGOUT"}` → delivered on the next heartbeat (`pendingCommand` becomes null).

Checks: `npm run typecheck -w @grm/desktop` (runs tsconfig.node.json + tsconfig.web.json), `npm run build -w @grm/desktop`.

If `node_modules/electron/dist` is missing: npm 11 blocked the install script — `npm approve-scripts electron`, then `node node_modules/electron/install.js` (`npm rebuild electron` alone did not download the binary here).

## Package

```bash
npm run dist:win -w @grm/desktop    # NSIS installer (build on Windows/CI)
npm run dist -w @grm/desktop        # current OS
```

Gotchas:
- `electron-builder.yml` pins `electronVersion` (electron is hoisted to the workspace root, so a `^` range can't be resolved). Bump it together with the `electron` devDependency.
- On Apple Silicon without Rosetta, `dist:win` produces `release/win-unpacked/` (valid x64 `GameRoomClient.exe` + `app.asar`) but fails at the installer step: bundled `makensis` is x86_64 → `spawn Unknown system error -86`. Build on Windows/CI, or install Rosetta. `win-unpacked` can be copied to a PC for a quick test.
- Artifact names derive from the scoped package name (`@grmdesktop-…nsis.7z` for the intermediate payload); the installer uses `artifactName` → `GameRoomClient-Setup.exe`.

Packaged build = 100% kiosk window, no devtools/menu, real game launch + taskkill on Windows, real shutdown, autoStart via `app.setLoginItemSettings`. Tell game room admins to run games in borderless/windowed fullscreen so the mini widget stays visible. Real lockdown needs OS help (Windows Assigned Access / shell replacement) — see docs/desktop.md.
