// API response shapes. Dates arrive as ISO strings over JSON.
// Keep in sync with apps/api/src/common/mappers.ts and the service return values.

export type TransactionType = 'TOPUP' | 'DEDUCTION' | 'SESSION_CHARGE';
export type SessionStatus = 'ACTIVE' | 'ENDED';
export type SessionEndReason = 'LOGOUT' | 'BALANCE_DEPLETED' | 'TIMEOUT' | 'ADMIN_FORCED' | 'REPLACED';
export type AlertType = 'LOW_BALANCE' | 'BALANCE_DEPLETED';
export type PcCommand = 'LOGOUT' | 'SHUTDOWN';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PcRef {
  id: number;
  number: number;
  name: string;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  balanceSeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activeSession: {
    id: number;
    startedAt: string;
    lastHeartbeatAt: string;
    consumedSeconds: number;
    pc: PcRef;
  } | null;
}

export interface UserDetailDto extends UserDto {
  stats: { sessionsCount: number; consumedSeconds: number; toppedUpSeconds: number };
}

export interface TransactionDto {
  id: number;
  type: TransactionType;
  amountSeconds: number;
  balanceAfterSeconds: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  admin: { id: number; name: string } | null;
  session: { id: number; status: SessionStatus; startedAt: string; endedAt: string | null; pc: PcRef } | null;
}

export interface SessionDto {
  id: number;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  endReason: SessionEndReason | null;
  lastHeartbeatAt: string;
  consumedSeconds: number;
  pc?: PcRef;
  user?: { id: number; name: string };
}

export interface AlertDto {
  id: number;
  type: AlertType;
  message: string;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: { id: number; name: string } | null;
  sessionId: number | null;
  user: { id: number; name: string; phone: string };
  pc: PcRef | null;
}

export interface AlertsResponse extends Paginated<AlertDto> {
  openCount: number;
}

export interface PcDto {
  id: number;
  number: number;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
  appVersion: string | null;
  ipAddress: string | null;
  pendingCommand: PcCommand | null;
  commandIssuedAt: string | null;
  currentSession: {
    id: number;
    /** Game launched from the desktop library (updated once per heartbeat), or null */
    game: string | null;
    startedAt: string;
    lastHeartbeatAt: string;
    consumedSeconds: number;
    user: { id: number; name: string; phone: string; balanceSeconds: number };
  } | null;
}

export interface PcsResponse {
  serverTime: string;
  heartbeatIntervalSeconds: number;
  lowBalanceThresholdSeconds: number;
  summary: { total: number; online: number; busy: number };
  items: PcDto[];
}

export interface Principal {
  role: 'admin' | 'user';
  id: number;
  email: string;
  name: string;
}

export type MeResponse = { role: 'admin'; admin: Principal } | { role: 'user'; user: UserDto };

export interface ReportSummary {
  from: string;
  to: string;
  timezone: string;
  totals: {
    sessions: number;
    usageSeconds: number;
    uniqueUsers: number;
    topupSeconds: number;
    topupCount: number;
    deductionSeconds: number;
    deductionCount: number;
    depletedAlerts: number;
    lowBalanceAlerts: number;
  };
  byDay: { date: string; sessions: number; usageSeconds: number; topupSeconds: number; deductionSeconds: number }[];
  byUser: {
    userId: number;
    name: string;
    deleted: boolean;
    sessions: number;
    usageSeconds: number;
    topupSeconds: number;
    deductionSeconds: number;
  }[];
  byPc: { pcId: number; number: number; name: string; sessions: number; usageSeconds: number; uniqueUsers: number }[];
}

// ---- games

export type GameLaunchType = 'STEAM' | 'EXE' | 'URL';

export interface DesktopGame {
  id: number;
  name: string;
  launchType: GameLaunchType;
  steamAppId: number | null;
  exePath: string | null;
  args: string | null;
  url: string | null;
  /** Windows image names to kill when the session ends, e.g. ["cs2.exe"] */
  processNames: string[];
  imageUrl: string | null;
}

export interface GameDto extends DesktopGame {
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** POST /games body; PATCH accepts any subset. */
export interface GameInput {
  name: string;
  launchType: GameLaunchType;
  steamAppId?: number | null;
  exePath?: string | null;
  args?: string | null;
  url?: string | null;
  processNames?: string[];
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

// ---- desktop

export interface DesktopSessionState {
  id: number;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  endReason: SessionEndReason | null;
  consumedSeconds: number;
  balanceSeconds: number;
  user: { id: number; name: string };
}

export interface DesktopLoginResponse {
  sessionToken: string;
  resumed: boolean;
  session: DesktopSessionState;
  heartbeatIntervalSeconds: number;
  lowBalanceThresholdSeconds: number;
}

export interface DesktopHeartbeatResponse {
  serverTime: string;
  pc: PcRef;
  command: PcCommand | null;
  session: DesktopSessionState | null;
  sessionError: string | null;
  heartbeatIntervalSeconds: number;
  lowBalanceThresholdSeconds: number;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}
