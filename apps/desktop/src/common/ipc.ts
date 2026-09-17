// Contract between main, preload and renderer. Type-only for the renderer.
import type { DesktopGame, Lang, SessionEndReason } from '@grm/shared';

export const IPC = {
  state: 'grm:state',
  getState: 'grm:get-state',
  login: 'grm:login',
  logout: 'grm:logout',
  dismissMessage: 'grm:dismiss-message',
  launchGame: 'grm:launch-game',
  showLibrary: 'grm:show-library',
  unlockSettings: 'grm:settings-unlock',
  getSettings: 'grm:settings-get',
  testSettings: 'grm:settings-test',
  saveSettings: 'grm:settings-save',
  lockSettings: 'grm:settings-lock',
  quit: 'grm:quit',
} as const;

export interface DesktopConfig {
  /** e.g. https://gameroom.example.com or http://192.168.1.10:4000 (with or without /api) */
  apiUrl: string;
  /** 1–10 */
  pcNumber: number | null;
  /** must equal the API's PC_AGENT_KEY */
  pcKey: string;
  language: Lang;
  /** shut the PC down when the balance runs out (dry-run in dev builds) */
  shutdownOnExpire: boolean;
  shutdownDelaySeconds: number;
  /** start the client when the OS user logs in (packaged builds only) */
  autoStart: boolean;
}

export type PublicConfig = Omit<DesktopConfig, 'pcKey'>;

export type Phase = 'unconfigured' | 'idle' | 'active' | 'expired' | 'message';

/** full = kiosk full screen; mini = small always-on-top countdown widget while a game runs */
export type WindowMode = 'full' | 'mini';

export type MessageKind =
  | 'ENDED'
  | 'COMMAND_LOGOUT'
  | 'COMMAND_SHUTDOWN'
  | 'OFFLINE'
  | 'SESSION_INVALID'
  | 'TOPPED_UP';

export type NoticeKind = 'DRY_RUN_SHUTDOWN' | 'SHUTDOWN_FAILED' | 'DRY_RUN_LAUNCH';

export interface AppState {
  phase: Phase;
  windowMode: WindowMode;
  appVersion: string;
  isDev: boolean;
  configured: boolean;
  config: PublicConfig;
  pc: { number: number | null; name: string | null };
  /** result of the last heartbeat */
  online: boolean;
  lastError: string | null;
  /** a saved session token is waiting for the first heartbeat */
  resuming: boolean;
  user: { id: number; name: string } | null;
  session: { id: number; startedAt: string } | null;
  /** server balance at `balanceSyncedAt` (epoch ms); the UI counts down locally from it */
  balanceSeconds: number;
  balanceSyncedAt: number;
  /** game library (last fetched or cached list) */
  games: DesktopGame[];
  gamesStatus: 'idle' | 'loading' | 'ok' | 'error';
  /** id of the game currently being launched */
  launchingGameId: number | null;
  /** name of the last game launched in this session; sent with the regular heartbeat (admin sees it on the PC card) */
  currentGame: string | null;
  warning: { level: 'LOW_5' | 'LOW_1'; at: number } | null;
  expired: { until: number; willShutdown: boolean; dryRun: boolean } | null;
  message: { kind: MessageKind; reason?: SessionEndReason | null; until: number; shutdownAt?: number } | null;
  notice: { kind: NoticeKind; at: number; detail?: string } | null;
}

export type ActionResult = { ok: true } | { ok: false; code: string; details?: unknown };

export interface SettingsPayload {
  config: DesktopConfig;
  /** env variables currently overriding saved values */
  envOverrides: string[];
  configPath: string;
}

export interface GrmBridge {
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  login(login: string, password: string): Promise<ActionResult>;
  logout(): Promise<void>;
  dismissMessage(): Promise<void>;
  launchGame(gameId: number): Promise<ActionResult>;
  showLibrary(): Promise<void>;
  unlockSettings(email: string, password: string): Promise<ActionResult>;
  getSettings(): Promise<SettingsPayload | null>;
  testSettings(draft: DesktopConfig): Promise<ActionResult & { pcName?: string }>;
  saveSettings(draft: DesktopConfig): Promise<ActionResult>;
  lockSettings(): Promise<void>;
  quit(): Promise<ActionResult>;
}
