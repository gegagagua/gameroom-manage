import type { DesktopGame, DesktopHeartbeatResponse, DesktopLoginResponse, DesktopSessionState } from '@grm/shared';

const TIMEOUT_MS = 10_000;

export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface Connection {
  apiUrl: string;
  pcKey: string;
}

/** Accepts "http://host:4000", "http://host:4000/" or "https://host/api". */
export function apiBase(apiUrl: string) {
  return `${apiUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '')}/api`;
}

/** Thin HTTP client for the /api/desktop endpoints. Runs in the main process (no CORS, key stays out of the renderer). */
export class ApiClient {
  constructor(private readonly connection: () => Connection) {}

  heartbeat(pcNumber: number, token?: string, conn?: Connection, currentGame?: string | null) {
    const body = { pcNumber, appVersion: appVersion(), ...(currentGame ? { currentGame: currentGame.slice(0, 100) } : {}) };
    return this.request<DesktopHeartbeatResponse>('POST', 'heartbeat', body, token, conn);
  }

  login(pcNumber: number, login: string, password: string) {
    return this.request<DesktopLoginResponse>('POST', 'login', { pcNumber, login, password, appVersion: appVersion() });
  }

  logout(pcNumber: number, token: string, reason: 'USER' | 'EXPIRED') {
    return this.request<{ session: DesktopSessionState }>('POST', 'logout', { pcNumber, reason }, token);
  }

  /** Game library for the active session (fetched on login/resume only — not polled). */
  games(pcNumber: number, token: string) {
    return this.request<{ items: DesktopGame[] }>('GET', `games?pcNumber=${pcNumber}`, undefined, token);
  }

  verifyAdmin(email: string, password: string) {
    return this.request<{ ok: boolean }>('POST', 'verify-admin', { email, password });
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown, token?: string, conn?: Connection): Promise<T> {
    const { apiUrl, pcKey } = conn ?? this.connection();
    let res: Response;
    try {
      res = await fetch(`${apiBase(apiUrl)}/desktop/${path}`, {
        method,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          'x-pc-key': pcKey,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      throw new ApiRequestError('NETWORK', (err as Error).message, 0);
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON (proxy error page etc.) */
    }
    if (!res.ok) {
      const e = (data ?? {}) as { code?: string; message?: string; details?: unknown };
      throw new ApiRequestError(e.code ?? (res.status >= 500 ? 'INTERNAL' : 'NETWORK'), e.message ?? res.statusText, res.status, e.details);
    }
    return data as T;
  }
}

let version = '0.0.0';
export const setAppVersion = (v: string) => (version = v);
const appVersion = () => version;
