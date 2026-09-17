import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Parses "90", "30s", "15m", "12h", "7d" into seconds. */
export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd]?)$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: "${value}"`);
  const n = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit]!;
  return n * mult;
}

/** Typed, validated view over environment variables. Fails fast on startup. */
@Injectable()
export class AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly corsOrigins: string[];
  readonly webUrl: string;

  readonly jwtSecret: string;
  readonly jwtExpiresInSeconds: number;
  readonly pcSessionTokenTtlSeconds = 24 * 3600;
  readonly cookieSecure: boolean;
  readonly cookieName = 'grm_token';

  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly adminName: string;

  readonly pcAgentKey: string;
  readonly pcCount: number;
  readonly heartbeatIntervalSeconds: number;
  readonly pcOnlineWindowSeconds: number;
  readonly sessionTimeoutSeconds: number;
  readonly lowBalanceThresholdSeconds: number;
  /** On an EXPIRED logout, a leftover balance up to this many seconds is treated as clock drift and consumed. */
  readonly expireToleranceSeconds = 60;

  readonly timezone: string;

  readonly smtp: { host: string; port: number; user: string; pass: string; from: string };

  constructor(cs: ConfigService) {
    const str = (key: string, def?: string): string => {
      const v = cs.get<string>(key);
      if (v !== undefined && v !== '') return v;
      if (def !== undefined) return def;
      throw new Error(`Missing required environment variable ${key}`);
    };
    const int = (key: string, def: number, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
      const raw = cs.get<string>(key);
      const n = raw === undefined || raw === '' ? def : Number(raw);
      if (!Number.isInteger(n) || n < min || n > max) {
        throw new Error(`Environment variable ${key} must be an integer in [${min}, ${max}], got "${raw}"`);
      }
      return n;
    };

    this.nodeEnv = str('NODE_ENV', 'development');
    this.port = int('PORT', 4000, 1, 65535);
    this.corsOrigins = str('CORS_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.webUrl = str('WEB_URL', 'http://localhost:3000').replace(/\/$/, '');

    this.jwtSecret = str('JWT_SECRET');
    if (this.nodeEnv === 'production' && this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
    this.jwtExpiresInSeconds = parseDurationSeconds(str('JWT_EXPIRES_IN', '12h'));
    this.cookieSecure = str('COOKIE_SECURE', 'false') === 'true';

    this.adminEmail = str('ADMIN_EMAIL').toLowerCase();
    this.adminPassword = str('ADMIN_PASSWORD');
    this.adminName = str('ADMIN_NAME', 'Administrator');

    this.pcAgentKey = str('PC_AGENT_KEY');
    this.pcCount = int('PC_COUNT', 10, 1, 500);
    this.heartbeatIntervalSeconds = int('HEARTBEAT_INTERVAL_SECONDS', 60, 10, 600);
    this.pcOnlineWindowSeconds = int('PC_ONLINE_WINDOW_SECONDS', 150, 20, 3600);
    this.sessionTimeoutSeconds = int('SESSION_TIMEOUT_SECONDS', 180, 30, 3600);
    this.lowBalanceThresholdSeconds = int('LOW_BALANCE_THRESHOLD_SECONDS', 300, 0, 86400);

    this.timezone = str('APP_TIMEZONE', 'Asia/Tbilisi');

    this.smtp = {
      host: str('SMTP_HOST', ''),
      port: int('SMTP_PORT', 587, 1, 65535),
      user: str('SMTP_USER', ''),
      pass: str('SMTP_PASS', ''),
      from: str('SMTP_FROM', 'Game Room <no-reply@gameroom.local>'),
    };
  }
}
