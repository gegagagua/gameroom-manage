import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DesktopConfig } from '../common/ipc';

export const MAX_PC_NUMBER = 10;

const DEFAULTS: DesktopConfig = {
  // Baked in at build time: MAIN_VITE_DEFAULT_API_URL=https://… npm run dist:win (prefills Settings on a fresh PC)
  apiUrl: import.meta.env.MAIN_VITE_DEFAULT_API_URL ?? '',
  pcNumber: null,
  pcKey: '',
  language: 'ka',
  shutdownOnExpire: true,
  shutdownDelaySeconds: 30,
  autoStart: true,
};

export interface SavedSession {
  token: string;
  apiUrl: string;
  pcNumber: number;
}

export function isConfigured(c: DesktopConfig): c is DesktopConfig & { pcNumber: number } {
  return !!c.apiUrl && !!c.pcKey && validPcNumber(c.pcNumber);
}

const validPcNumber = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_PC_NUMBER;

/** Returns an error code or null. */
export function validateConfig(c: DesktopConfig): string | null {
  if (!/^https?:\/\/[^\s]+$/i.test(c.apiUrl.trim())) return 'INVALID_API_URL';
  if (!validPcNumber(c.pcNumber)) return 'INVALID_PC_NUMBER';
  if (!c.pcKey.trim()) return 'INVALID_PC_KEY_EMPTY';
  if (!Number.isInteger(c.shutdownDelaySeconds) || c.shutdownDelaySeconds < 5 || c.shutdownDelaySeconds > 600) {
    return 'INVALID_SHUTDOWN_DELAY';
  }
  if (c.language !== 'ka' && c.language !== 'en') return 'VALIDATION_FAILED';
  return null;
}

/** Settings in `<userData>/config.json`, the PC session token in `<userData>/session.json`. */
export class ConfigStore {
  readonly configPath: string;
  private readonly sessionPath: string;
  private saved: DesktopConfig;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.configPath = join(dir, 'config.json');
    this.sessionPath = join(dir, 'session.json');
    this.saved = { ...DEFAULTS, ...readJson<Partial<DesktopConfig>>(this.configPath) };
  }

  /** Effective config: saved values with GRM_* environment overrides applied. */
  get(): DesktopConfig {
    const c = { ...this.saved };
    const env = process.env;
    if (env.GRM_API_URL) c.apiUrl = env.GRM_API_URL;
    if (env.GRM_PC_KEY) c.pcKey = env.GRM_PC_KEY;
    if (env.GRM_PC_NUMBER && validPcNumber(Number(env.GRM_PC_NUMBER))) c.pcNumber = Number(env.GRM_PC_NUMBER);
    return c;
  }

  getSaved(): DesktopConfig {
    return { ...this.saved };
  }

  envOverrides(): string[] {
    return ['GRM_API_URL', 'GRM_PC_NUMBER', 'GRM_PC_KEY'].filter((k) => !!process.env[k]);
  }

  save(next: DesktopConfig) {
    this.saved = {
      apiUrl: next.apiUrl.trim().replace(/\/+$/, ''),
      pcNumber: next.pcNumber,
      pcKey: next.pcKey.trim(),
      language: next.language,
      shutdownOnExpire: next.shutdownOnExpire,
      shutdownDelaySeconds: next.shutdownDelaySeconds,
      autoStart: next.autoStart,
    };
    writeJsonAtomic(this.configPath, this.saved);
  }

  loadSession(): SavedSession | null {
    const s = readJson<Partial<SavedSession>>(this.sessionPath);
    return s.token && s.apiUrl && s.pcNumber ? (s as SavedSession) : null;
  }

  saveSession(s: SavedSession) {
    writeJsonAtomic(this.sessionPath, s);
  }

  clearSession() {
    rmSync(this.sessionPath, { force: true });
  }
}

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return {} as T;
  }
}

function writeJsonAtomic(path: string, data: unknown) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, path);
}
