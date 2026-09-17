import type { DesktopGame, DesktopHeartbeatResponse, DesktopSessionState, PcCommand } from '@grm/shared';
import type { ActionResult, AppState, DesktopConfig, MessageKind, NoticeKind, SettingsPayload, WindowMode } from '../common/ipc';
import { ApiClient, ApiRequestError } from './api-client';
import { ConfigStore, isConfigured, validateConfig } from './config-store';
import { GameCatalogCache, killGames, launchGame } from './games';
import { isShutdownDryRun, shutdownPc } from './power';

/** Lock the session locally if the server has been unreachable this long. */
const OFFLINE_GRACE_MS = 180_000;
/** Heartbeat timers start after the previous response, so allow a little slack. */
const OFFLINE_SLACK_MS = 5_000;
const MESSAGE_VISIBLE_MS = 15_000;
const COMMAND_SHUTDOWN_DELAY_MS = 10_000;
const WARNING_VISIBLE_MS = 12_000;
const NOTICE_VISIBLE_MS = 10_000;
const SETTINGS_UNLOCK_MS = 5 * 60_000;
/** setTimeout overflows above 2^31-1 ms; heartbeats re-arm the timer every minute anyway. */
const MAX_TIMER_MS = 2_000_000_000;
const WARN_5_SECONDS = 300;
const WARN_1_SECONDS = 60;
/** On EXPIRED logout the server consumes a leftover ≤ 60 s; more than that means the balance was topped up. */
const TOPPED_UP_THRESHOLD_SECONDS = 60;

interface Options {
  appVersion: string;
  isDev: boolean;
  userDataDir: string;
  onQuit: () => void;
  setWindowMode: (mode: WindowMode) => Promise<void>;
}

/**
 * Owns the PC session: heartbeat loop (every heartbeatIntervalSeconds, idle included — never faster),
 * local expiry/warning timers, admin commands, the game library/launcher and shutdown.
 * The renderer only displays `AppState`.
 */
export class SessionManager {
  private state: AppState;
  private readonly api: ApiClient;
  private readonly gameCache: GameCatalogCache;
  private token: string | null = null;
  private intervalSeconds = 60;
  private lastOkAt: number | null = null;
  private warned5 = false;
  private warned1 = false;
  private settingsUnlockedUntil = 0;
  private autoLoginAttempted = false;
  private autoLaunchPending = false;
  private stopped = false;

  private heartbeatTimer?: NodeJS.Timeout;
  private expiryTimer?: NodeJS.Timeout;
  private warnTimers: NodeJS.Timeout[] = [];
  private phaseTimer?: NodeJS.Timeout;
  private warningClearTimer?: NodeJS.Timeout;
  private noticeClearTimer?: NodeJS.Timeout;

  constructor(
    private readonly store: ConfigStore,
    private readonly emit: (state: AppState) => void,
    private readonly opts: Options,
  ) {
    this.api = new ApiClient(() => {
      const c = this.store.get();
      return { apiUrl: c.apiUrl, pcKey: c.pcKey };
    });
    this.gameCache = new GameCatalogCache(opts.userDataDir);
    const config = store.get();
    this.state = {
      phase: isConfigured(config) ? 'idle' : 'unconfigured',
      windowMode: 'full',
      appVersion: opts.appVersion,
      isDev: opts.isDev,
      configured: isConfigured(config),
      config: publicConfig(config),
      pc: { number: config.pcNumber, name: null },
      online: false,
      lastError: null,
      resuming: false,
      user: null,
      session: null,
      balanceSeconds: 0,
      balanceSyncedAt: Date.now(),
      games: this.gameCache.load(),
      gamesStatus: 'idle',
      launchingGameId: null,
      currentGame: null,
      warning: null,
      expired: null,
      message: null,
      notice: null,
    };
  }

  // ------------------------------------------------------------------ lifecycle

  start() {
    const config = this.store.get();
    const saved = this.store.loadSession();
    if (saved && isConfigured(config) && saved.apiUrl === config.apiUrl && saved.pcNumber === config.pcNumber) {
      this.token = saved.token;
      this.set({ resuming: true });
    } else {
      if (saved) this.store.clearSession();
      // No session to resume → games left over from a crashed session must not keep running.
      void this.killGames('startup without session');
    }
    this.scheduleHeartbeat(0);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.heartbeatTimer);
    this.clearSessionTimers();
    clearTimeout(this.phaseTimer);
  }

  getState() {
    return this.state;
  }

  // ------------------------------------------------------------------ renderer actions

  async login(login: string, password: string): Promise<ActionResult> {
    const config = this.store.get();
    if (!isConfigured(config)) return { ok: false, code: 'NOT_CONFIGURED' };
    if (this.state.phase !== 'idle' && this.state.phase !== 'message') return { ok: false, code: 'BUSY' };
    if (this.state.message?.kind === 'COMMAND_SHUTDOWN') return { ok: false, code: 'BUSY' };
    try {
      const res = await this.api.login(config.pcNumber, login, password);
      this.token = res.sessionToken;
      this.store.saveSession({ token: res.sessionToken, apiUrl: config.apiUrl, pcNumber: config.pcNumber });
      this.lastOkAt = Date.now();
      this.intervalSeconds = res.heartbeatIntervalSeconds || 60;
      this.warned5 = this.warned1 = false;
      clearTimeout(this.phaseTimer);
      this.set({ online: true, lastError: null, message: null });
      this.applyActive(res.session);
      return { ok: true };
    } catch (err) {
      return toFailure(err);
    }
  }

  /** Logout button. The UI locks immediately; the server call is best effort (the stale sweep covers failures). */
  async logout() {
    const token = this.token;
    const config = this.store.get();
    this.dropToken();
    this.toIdle();
    this.endGamesAndRestore('logout');
    if (token && isConfigured(config)) {
      try {
        await this.api.logout(config.pcNumber, token, 'USER');
      } catch (err) {
        console.warn(`[session] logout failed: ${(err as Error).message}`);
      }
    }
  }

  dismissMessage() {
    if (this.state.phase === 'message' && this.state.message?.kind !== 'COMMAND_SHUTDOWN') this.toIdle();
  }

  // ------------------------------------------------------------------ games

  /** Launches a game from the current library (renderer passes only the id). Active session only. */
  async launch(gameId: number): Promise<ActionResult> {
    if (this.state.phase !== 'active') return { ok: false, code: 'BUSY' };
    if (this.state.launchingGameId !== null) return { ok: false, code: 'BUSY' };
    const game = this.state.games.find((g) => g.id === gameId);
    if (!game) return { ok: false, code: 'GAME_NOT_FOUND' };

    this.set({ launchingGameId: game.id });
    const result = await launchGame(game);
    this.set({ launchingGameId: null });
    if (!result.ok) return { ok: false, code: result.code };
    if (this.state.phase !== 'active') return { ok: true }; // session ended while launching

    this.set({ currentGame: game.name.slice(0, 100) });
    if (result.dryRun) this.showNotice('DRY_RUN_LAUNCH', game.name);
    await this.setWindowMode('mini');
    return { ok: true };
  }

  /** "Games" button in the mini widget → back to the full-screen library (games keep running). */
  async showLibrary() {
    if (this.state.phase === 'active') await this.setWindowMode('full');
  }

  private async loadGames() {
    const token = this.token;
    const config = this.store.get();
    if (!token || !isConfigured(config)) return;
    this.set({ gamesStatus: 'loading' });
    try {
      const { items } = await this.api.games(config.pcNumber, token);
      this.gameCache.save(items);
      if (token !== this.token) return;
      this.set({ games: items, gamesStatus: 'ok' });
      this.maybeAutoLaunch();
    } catch (err) {
      console.warn(`[games] library fetch failed: ${(err as Error).message}`);
      if (token === this.token) this.set({ gamesStatus: 'error' }); // keep showing the cached list
    }
  }

  private processNamesToKill(): string[] {
    const all: DesktopGame[] = [...this.state.games, ...this.gameCache.load()];
    return all.flatMap((g) => g.processNames ?? []);
  }

  private killGames(reason: string) {
    return killGames(this.processNamesToKill(), reason).catch((err) =>
      console.error(`[games] kill failed (${reason}): ${(err as Error).message}`),
    );
  }

  /** Session is over: FIRST kill games, THEN bring the kiosk window back to full screen. */
  private endGamesAndRestore(reason: string) {
    this.set({ currentGame: null });
    void this.killGames(reason).then(() => this.setWindowMode('full'));
  }

  private async setWindowMode(mode: WindowMode) {
    await this.opts.setWindowMode(mode);
    this.set({ windowMode: mode });
  }

  // ------------------------------------------------------------------ settings (admin)

  isSettingsUnlocked() {
    return !this.state.configured || Date.now() < this.settingsUnlockedUntil;
  }

  async unlockSettings(email: string, password: string): Promise<ActionResult> {
    if (!this.state.configured) return { ok: true };
    try {
      const { ok } = await this.api.verifyAdmin(email, password);
      if (!ok) return { ok: false, code: 'INVALID_CREDENTIALS' };
      this.settingsUnlockedUntil = Date.now() + SETTINGS_UNLOCK_MS;
      return { ok: true };
    } catch (err) {
      return toFailure(err);
    }
  }

  lockSettings() {
    this.settingsUnlockedUntil = 0;
  }

  getSettings(): SettingsPayload | null {
    if (!this.isSettingsUnlocked()) return null;
    return { config: this.store.getSaved(), envOverrides: this.store.envOverrides(), configPath: this.store.configPath };
  }

  async testSettings(draft: DesktopConfig): Promise<ActionResult & { pcName?: string }> {
    if (!this.isSettingsUnlocked()) return { ok: false, code: 'FORBIDDEN' };
    const invalid = validateConfig(draft);
    if (invalid) return { ok: false, code: invalid };
    try {
      const res = await this.api.heartbeat(draft.pcNumber!, undefined, { apiUrl: draft.apiUrl, pcKey: draft.pcKey });
      return { ok: true, pcName: res.pc.name };
    } catch (err) {
      return toFailure(err);
    }
  }

  saveSettings(draft: DesktopConfig): ActionResult {
    if (!this.isSettingsUnlocked()) return { ok: false, code: 'FORBIDDEN' };
    if (this.state.phase === 'active' || this.state.phase === 'expired') return { ok: false, code: 'BUSY' };
    const invalid = validateConfig(draft);
    if (invalid) return { ok: false, code: invalid };

    const before = this.store.get();
    this.store.save(draft);
    const config = this.store.get();
    if (before.apiUrl !== config.apiUrl || before.pcNumber !== config.pcNumber) {
      this.dropToken();
      this.set({ pc: { number: config.pcNumber, name: null } });
    }
    const configured = isConfigured(config);
    this.set({
      configured,
      config: publicConfig(config),
      phase: configured ? (this.state.phase === 'unconfigured' ? 'idle' : this.state.phase) : 'unconfigured',
    });
    if (configured) this.settingsUnlockedUntil = Math.max(this.settingsUnlockedUntil, Date.now() + SETTINGS_UNLOCK_MS);
    // Configuration changed → verify it right away, then continue on the normal interval.
    this.scheduleHeartbeat(0);
    return { ok: true };
  }

  quit(): ActionResult {
    if (!this.isSettingsUnlocked()) return { ok: false, code: 'FORBIDDEN' };
    this.opts.onQuit();
    return { ok: true };
  }

  // ------------------------------------------------------------------ heartbeat

  private scheduleHeartbeat(delayMs: number) {
    clearTimeout(this.heartbeatTimer);
    if (this.stopped) return;
    this.heartbeatTimer = setTimeout(() => void this.heartbeat(), delayMs);
  }

  private async heartbeat() {
    const config = this.store.get();
    if (!isConfigured(config)) {
      this.set({ phase: 'unconfigured', configured: false, online: false });
      return; // resumed by saveSettings()
    }
    const token = this.token;
    try {
      // currentGame rides along with the regular heartbeat — launching a game never triggers an extra call
      const currentGame = token && this.state.phase === 'active' ? this.state.currentGame : null;
      const res = await this.api.heartbeat(config.pcNumber, token ?? undefined, undefined, currentGame);
      this.lastOkAt = Date.now();
      this.intervalSeconds = res.heartbeatIntervalSeconds || 60;
      this.set({ online: true, lastError: null, pc: { number: res.pc.number, name: res.pc.name } });

      if (res.command) this.handleCommand(res.command);
      else if (token && token === this.token) this.handleSession(res);
      this.maybeAutoLogin();
    } catch (err) {
      const code = err instanceof ApiRequestError ? err.code : 'NETWORK';
      console.warn(`[heartbeat] failed: ${code} ${(err as Error).message}`);
      this.set({ online: false, lastError: code });
      if (
        this.state.phase === 'active' &&
        this.lastOkAt !== null &&
        Date.now() - this.lastOkAt >= OFFLINE_GRACE_MS - OFFLINE_SLACK_MS
      ) {
        this.lockWithMessage('OFFLINE');
      }
    } finally {
      this.scheduleHeartbeat(this.intervalSeconds * 1000);
    }
  }

  private handleSession(res: DesktopHeartbeatResponse) {
    const s = res.session;
    if (res.sessionError || !s) {
      this.dropToken();
      if (this.state.phase === 'active') this.lockWithMessage('SESSION_INVALID');
      else {
        this.set({ resuming: false });
        void this.killGames('resume failed'); // saved session is gone → leftovers from before the restart
      }
      return;
    }
    if (s.status === 'ACTIVE') {
      this.applyActive(s);
      return;
    }
    // Ended on the server (balance depleted, timeout, admin…)
    this.dropToken();
    const wasActive = this.state.phase === 'active';
    this.set({ resuming: false });
    if (!wasActive) {
      void this.killGames('resume: session already ended');
      return;
    }
    if (s.endReason === 'BALANCE_DEPLETED') this.enterExpired();
    else this.lockWithMessage('ENDED', s.endReason);
  }

  private handleCommand(command: PcCommand) {
    // The server already ended the session when the admin issued the command.
    const hadSession = this.state.phase === 'active' || !!this.token;
    this.dropToken();
    if (command === 'SHUTDOWN') {
      this.clearSessionTimers();
      clearTimeout(this.phaseTimer);
      const shutdownAt = Date.now() + COMMAND_SHUTDOWN_DELAY_MS;
      this.set({
        phase: 'message',
        resuming: false,
        warning: null,
        expired: null,
        message: { kind: 'COMMAND_SHUTDOWN', until: shutdownAt, shutdownAt },
      });
      this.endGamesAndRestore('admin SHUTDOWN');
      this.phaseTimer = setTimeout(() => void this.shutdown('admin command'), COMMAND_SHUTDOWN_DELAY_MS);
    } else if (hadSession) {
      this.lockWithMessage('COMMAND_LOGOUT');
    }
  }

  private maybeAutoLogin() {
    // Dev-only test hook: GRM_AUTOLOGIN="login:password" (+ optional GRM_AUTOLAUNCH="<game name or id>")
    const spec = process.env.GRM_AUTOLOGIN;
    if (!this.opts.isDev || !spec || this.autoLoginAttempted || this.state.phase !== 'idle' || this.token) return;
    this.autoLoginAttempted = true;
    this.autoLaunchPending = !!process.env.GRM_AUTOLAUNCH;
    const i = spec.indexOf(':');
    void this.login(spec.slice(0, i), spec.slice(i + 1)).then((r) => console.log('[dev] auto-login', r));
  }

  private maybeAutoLaunch() {
    const target = process.env.GRM_AUTOLAUNCH?.trim().toLowerCase();
    if (!this.opts.isDev || !this.autoLaunchPending || !target) return;
    this.autoLaunchPending = false;
    const game = this.state.games.find((g) => String(g.id) === target || g.name.toLowerCase() === target);
    if (!game) {
      console.warn(`[dev] auto-launch: no game "${target}" in library of ${this.state.games.length}`);
      return;
    }
    void this.launch(game.id).then((r) => console.log(`[dev] auto-launch "${game.name}"`, r, `window=${this.state.windowMode}`));
  }

  // ------------------------------------------------------------------ session timers

  private applyActive(s: DesktopSessionState) {
    const now = Date.now();
    const isNewSession = this.state.session?.id !== s.id;
    if (isNewSession) {
      this.warned5 = this.warned1 = false;
      this.set({ currentGame: null });
    }
    this.set({
      phase: 'active',
      resuming: false,
      user: s.user,
      session: { id: s.id, startedAt: s.startedAt },
      balanceSeconds: s.balanceSeconds,
      balanceSyncedAt: now,
      expired: null,
    });
    this.armSessionTimers();
    // Library is fetched on login / resume only — an event, not polling.
    if (isNewSession) void this.loadGames();
  }

  private remainingSeconds() {
    return this.state.balanceSeconds - (Date.now() - this.state.balanceSyncedAt) / 1000;
  }

  private armSessionTimers() {
    this.clearSessionTimers();
    const remaining = this.remainingSeconds();
    this.expiryTimer = setTimeout(() => void this.expire(), Math.min(Math.max(0, remaining * 1000), MAX_TIMER_MS));

    if (remaining <= WARN_1_SECONDS) {
      if (!this.warned1) this.warn('LOW_1');
      return;
    }
    if (remaining <= WARN_5_SECONDS) {
      if (!this.warned5) this.warn('LOW_5');
    } else if (!this.warned5) {
      this.warnTimers.push(setTimeout(() => this.warn('LOW_5'), Math.min((remaining - WARN_5_SECONDS) * 1000, MAX_TIMER_MS)));
    }
    if (!this.warned1) {
      this.warnTimers.push(setTimeout(() => this.warn('LOW_1'), Math.min((remaining - WARN_1_SECONDS) * 1000, MAX_TIMER_MS)));
    }
  }

  private warn(level: 'LOW_5' | 'LOW_1') {
    if (this.state.phase !== 'active') return;
    if (level === 'LOW_5') this.warned5 = true;
    else this.warned5 = this.warned1 = true;
    const at = Date.now();
    this.set({ warning: { level, at } });
    clearTimeout(this.warningClearTimer);
    this.warningClearTimer = setTimeout(() => {
      if (this.state.warning?.at === at) this.set({ warning: null });
    }, WARNING_VISIBLE_MS);
  }

  private clearSessionTimers() {
    clearTimeout(this.expiryTimer);
    this.warnTimers.forEach(clearTimeout);
    this.warnTimers = [];
  }

  /** Local countdown reached zero: lock now, tell the server once (reason EXPIRED). */
  private async expire() {
    if (this.state.phase !== 'active') return;
    if (this.remainingSeconds() > 1) {
      this.armSessionTimers(); // timer was capped or clock adjusted
      return;
    }
    const token = this.token;
    const config = this.store.get();
    this.dropToken();
    this.enterExpired();
    if (!token || !isConfigured(config)) return;
    try {
      const res = await this.api.logout(config.pcNumber, token, 'EXPIRED');
      // getState(): phase may have changed while awaiting (TS narrowed this.state.phase to 'active' above)
      if (res.session.balanceSeconds > TOPPED_UP_THRESHOLD_SECONDS && this.getState().phase === 'expired') {
        this.lockWithMessage('TOPPED_UP'); // admin added time during the last minute — don't shut down
      }
    } catch (err) {
      console.warn(`[session] EXPIRED logout failed (server will time the session out): ${(err as Error).message}`);
    }
  }

  private enterExpired() {
    this.clearSessionTimers();
    clearTimeout(this.phaseTimer);
    const config = this.store.get();
    const delayMs = config.shutdownDelaySeconds * 1000;
    this.set({
      phase: 'expired',
      warning: null,
      message: null,
      balanceSeconds: 0,
      balanceSyncedAt: Date.now(),
      expired: { until: Date.now() + delayMs, willShutdown: config.shutdownOnExpire, dryRun: isShutdownDryRun() },
    });
    this.endGamesAndRestore('balance expired');
    this.phaseTimer = setTimeout(() => {
      if (config.shutdownOnExpire) void this.shutdown('balance expired');
      else this.toIdle();
    }, delayMs);
  }

  private async shutdown(reason: string) {
    const result = await shutdownPc(reason);
    if (result.dryRun || result.error) {
      this.showNotice(result.dryRun ? 'DRY_RUN_SHUTDOWN' : 'SHUTDOWN_FAILED');
      this.toIdle();
    }
  }

  private lockWithMessage(kind: MessageKind, reason?: DesktopSessionState['endReason']) {
    this.dropToken();
    this.clearSessionTimers();
    clearTimeout(this.phaseTimer);
    this.set({
      phase: 'message',
      resuming: false,
      warning: null,
      expired: null,
      message: { kind, reason: reason ?? null, until: Date.now() + MESSAGE_VISIBLE_MS },
    });
    this.endGamesAndRestore(`session locked: ${kind}`);
    this.phaseTimer = setTimeout(() => this.toIdle(), MESSAGE_VISIBLE_MS);
  }

  private toIdle() {
    this.clearSessionTimers();
    clearTimeout(this.phaseTimer);
    this.set({
      phase: this.state.configured ? 'idle' : 'unconfigured',
      resuming: false,
      user: null,
      session: null,
      balanceSeconds: 0,
      balanceSyncedAt: Date.now(),
      launchingGameId: null,
      currentGame: null,
      warning: null,
      expired: null,
      message: null,
    });
  }

  private showNotice(kind: NoticeKind, detail?: string) {
    const at = Date.now();
    this.set({ notice: { kind, at, detail } });
    clearTimeout(this.noticeClearTimer);
    this.noticeClearTimer = setTimeout(() => {
      if (this.state.notice?.at === at) this.set({ notice: null });
    }, NOTICE_VISIBLE_MS);
  }

  private dropToken() {
    this.token = null;
    this.store.clearSession();
  }

  private set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.emit(this.state);
  }
}

function publicConfig(c: DesktopConfig) {
  const { pcKey: _ignored, ...rest } = c;
  return rest;
}

function toFailure(err: unknown): ActionResult {
  if (err instanceof ApiRequestError) return { ok: false, code: err.code, details: err.details };
  return { ok: false, code: 'INTERNAL' };
}
