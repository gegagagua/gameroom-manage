import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AlertType, Pc, Session, SessionEndReason, SessionStatus, TransactionType } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import type { PcSessionJwtPayload } from '../auth/auth.types';
import { verifyPassword } from '../auth/password';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { lockPc, lockSession, lockUsers, PrismaService, Tx } from '../common/prisma.service';
import { secondsBetween } from '../common/time';
import { AppConfig } from '../config/app-config';
import { findUserByLogin } from '../users/user-lookup';
import { DesktopLoginDto, DesktopLogoutDto, HeartbeatDto } from './desktop.dto';

/** Session state as seen by the desktop client. */
export interface SessionState {
  id: number;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  endReason: SessionEndReason | null;
  consumedSeconds: number;
  balanceSeconds: number;
  user: { id: number; name: string };
}

/**
 * Time-based billing. INVARIANTS (see docs/billing.md):
 *  - users.balance_seconds never goes below 0.
 *  - Charges are computed server-side from sessions.last_billed_at; the client's clock is never trusted.
 *  - Every mutation runs in a DB transaction holding row locks in the order pcs → users → sessions.
 *  - Each session owns exactly one SESSION_CHARGE transaction, kept equal to -consumed_seconds.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly config: AppConfig,
    private readonly jwt: JwtService,
    private readonly alerts: AlertsService,
  ) {}

  // ---------------------------------------------------------------- desktop API

  async pcLogin(dto: DesktopLoginDto, meta: { ip?: string }) {
    const pc = await this.findPc(dto.pcNumber);
    const user = await findUserByLogin(this.prisma, dto.login);
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw ApiError.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Invalid login or password');
    }
    if (!user.isActive) throw ApiError.forbidden(ErrorCode.USER_INACTIVE, 'User is deactivated');
    if (user.balanceSeconds <= 0) throw ApiError.forbidden(ErrorCode.NO_BALANCE, 'No balance left');

    const now = this.clock.now();
    type Outcome =
      | { kind: 'ok'; session: Session; balanceSeconds: number; resumed: boolean }
      | { kind: 'elsewhere'; pcId: number }
      | { kind: 'no_balance' };

    const outcome = await this.prisma.$transaction<Outcome>(async (tx) => {
      await lockPc(tx, pc.id);
      const pcActive0 = await tx.session.findFirst({ where: { pcId: pc.id, status: SessionStatus.ACTIVE } });
      await lockUsers(tx, pcActive0 ? [user.id, pcActive0.userId] : [user.id]);
      // re-read after locks (heartbeats/sweeps may have ended sessions meanwhile)
      const pcActive = await tx.session.findFirst({ where: { pcId: pc.id, status: SessionStatus.ACTIVE } });
      const userActive = await tx.session.findFirst({ where: { userId: user.id, status: SessionStatus.ACTIVE } });

      await tx.pc.update({
        where: { id: pc.id },
        data: {
          lastSeenAt: now,
          ipAddress: meta.ip,
          currentGame: null,
          ...(dto.appVersion ? { appVersion: dto.appVersion } : {}),
        },
      });

      // Same user, same PC (e.g. desktop app restarted) → resume the session.
      if (pcActive && pcActive.userId === user.id) {
        await lockSession(tx, pcActive.id);
        const charged = await this.charge(tx, pcActive, now);
        if (charged.balanceSeconds === 0) {
          await this.endLocked(tx, charged.session, now, SessionEndReason.BALANCE_DEPLETED, now);
          return { kind: 'no_balance' };
        }
        const session = await tx.session.update({ where: { id: pcActive.id }, data: { lastHeartbeatAt: now } });
        return { kind: 'ok', session, balanceSeconds: charged.balanceSeconds, resumed: true };
      }

      if (userActive && userActive.pcId !== pc.id) {
        const stale = secondsBetween(userActive.lastHeartbeatAt, now) > this.config.sessionTimeoutSeconds;
        if (!stale) return { kind: 'elsewhere', pcId: userActive.pcId };
        await lockSession(tx, userActive.id);
        await this.endLocked(tx, userActive, now, SessionEndReason.TIMEOUT, this.probableEnd(userActive, now));
      }

      if (pcActive && pcActive.userId !== user.id) {
        await lockSession(tx, pcActive.id);
        await this.endLocked(tx, pcActive, now, SessionEndReason.REPLACED, this.probableEnd(pcActive, now));
      }

      const { balanceSeconds } = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (balanceSeconds <= 0) return { kind: 'no_balance' };

      const session = await tx.session.create({
        data: { userId: user.id, pcId: pc.id, startedAt: now, lastBilledAt: now, lastHeartbeatAt: now },
      });
      await tx.balanceTransaction.create({
        data: {
          userId: user.id,
          type: TransactionType.SESSION_CHARGE,
          amountSeconds: 0,
          balanceAfterSeconds: balanceSeconds,
          sessionId: session.id,
          note: pc.name,
          createdAt: now,
        },
      });
      return { kind: 'ok', session, balanceSeconds, resumed: false };
    });

    if (outcome.kind === 'elsewhere') {
      const other = await this.prisma.pc.findUnique({ where: { id: outcome.pcId } });
      throw ApiError.conflict(ErrorCode.ALREADY_LOGGED_IN_ELSEWHERE, `User is already logged in on ${other?.name}`, {
        pcNumber: other?.number,
      });
    }
    if (outcome.kind === 'no_balance') throw ApiError.forbidden(ErrorCode.NO_BALANCE, 'No balance left');

    const payload: PcSessionJwtPayload = { sub: user.id, sid: outcome.session.id, pc: pc.number, typ: 'pc' };
    const sessionToken = await this.jwt.signAsync(payload, { expiresIn: 7 * 24 * 3600 });
    return {
      sessionToken,
      resumed: outcome.resumed,
      session: this.toState(outcome.session, outcome.balanceSeconds, user),
      heartbeatIntervalSeconds: this.config.heartbeatIntervalSeconds,
      lowBalanceThresholdSeconds: this.config.lowBalanceThresholdSeconds,
    };
  }

  /**
   * Called by every desktop client once per heartbeat interval (60s), with or without a session.
   * Marks the PC online, delivers one pending admin command, and bills the session if a token is sent.
   */
  async heartbeat(dto: HeartbeatDto, sessionToken: string | undefined, meta: { ip?: string }) {
    const now = this.clock.now();
    const pc = await this.findPc(dto.pcNumber);

    const command = await this.prisma.$transaction(async (tx) => {
      await lockPc(tx, pc.id);
      const fresh = await tx.pc.findUniqueOrThrow({ where: { id: pc.id } });
      await tx.pc.update({
        where: { id: pc.id },
        data: {
          lastSeenAt: now,
          ipAddress: meta.ip,
          ...(dto.appVersion ? { appVersion: dto.appVersion } : {}),
          pendingCommand: null,
          commandIssuedAt: null,
        },
      });
      return fresh.pendingCommand;
    });

    let session: SessionState | null = null;
    let sessionError: ErrorCode | null = null;
    if (sessionToken) {
      const payload = await this.verifyPcToken(sessionToken, pc.number);
      session = payload ? await this.billHeartbeat(payload.sid, now) : null;
      if (!session) sessionError = ErrorCode.INVALID_SESSION_TOKEN;
    }

    const currentGame = session?.status === SessionStatus.ACTIVE ? dto.currentGame?.trim() || null : null;
    if (currentGame !== pc.currentGame) {
      await this.prisma.pc.update({ where: { id: pc.id }, data: { currentGame } });
    }

    return {
      serverTime: now,
      pc: { id: pc.id, number: pc.number, name: pc.name },
      command,
      session,
      sessionError,
      heartbeatIntervalSeconds: this.config.heartbeatIntervalSeconds,
      lowBalanceThresholdSeconds: this.config.lowBalanceThresholdSeconds,
    };
  }

  async pcLogout(dto: DesktopLogoutDto, sessionToken: string | undefined) {
    const payload = sessionToken ? await this.verifyPcToken(sessionToken, dto.pcNumber) : null;
    if (!payload) throw ApiError.unauthorized(ErrorCode.INVALID_SESSION_TOKEN, 'Invalid session token');
    const now = this.clock.now();

    const session = await this.prisma.$transaction(async (tx) => {
      const s0 = await tx.session.findUnique({ where: { id: payload.sid } });
      if (!s0) throw ApiError.unauthorized(ErrorCode.INVALID_SESSION_TOKEN, 'Invalid session token');
      await lockUsers(tx, [s0.userId]);
      await lockSession(tx, s0.id);
      const s = await tx.session.findUniqueOrThrow({ where: { id: s0.id }, include: { user: true } });
      if (s.status !== SessionStatus.ACTIVE) return this.toState(s, s.user.balanceSeconds, s.user);

      if (dto.reason === 'EXPIRED') {
        // The client's countdown hit zero. Bill up to now; a small leftover is clock drift → consume it.
        const charged = await this.charge(tx, s, now);
        if (charged.balanceSeconds <= this.config.expireToleranceSeconds) {
          const ended = await this.endLocked(tx, charged.session, now, SessionEndReason.BALANCE_DEPLETED, now, {
            consumeAll: true,
          });
          return this.toState(ended.session, ended.balanceSeconds, s.user);
        }
        const ended = await this.endLocked(tx, charged.session, now, SessionEndReason.LOGOUT, now);
        return this.toState(ended.session, ended.balanceSeconds, s.user);
      }

      const ended = await this.endLocked(tx, s, now, SessionEndReason.LOGOUT, now);
      return this.toState(ended.session, ended.balanceSeconds, s.user);
    });
    return { session };
  }

  /** Throws 401 unless the token belongs to an ACTIVE session on this PC (used by /desktop/games). */
  async assertActiveSession(sessionToken: string | undefined, pcNumber: number) {
    const payload = sessionToken ? await this.verifyPcToken(sessionToken, pcNumber) : null;
    const session = payload ? await this.prisma.session.findUnique({ where: { id: payload.sid } }) : null;
    if (!session || session.status !== SessionStatus.ACTIVE) {
      throw ApiError.unauthorized(ErrorCode.INVALID_SESSION_TOKEN, 'No active session');
    }
    return session;
  }

  // ---------------------------------------------------------------- admin / maintenance

  /** Ends the active session on a PC. Caller must already hold the PC lock inside `tx`. */
  async forceEndOnPcLocked(tx: Tx, pcId: number, now: Date) {
    const active = await tx.session.findFirst({ where: { pcId, status: SessionStatus.ACTIVE } });
    if (!active) return null;
    await lockUsers(tx, [active.userId]);
    await lockSession(tx, active.id);
    const fresh = await tx.session.findUniqueOrThrow({ where: { id: active.id } });
    if (fresh.status !== SessionStatus.ACTIVE) return null;
    return this.endLocked(tx, fresh, now, SessionEndReason.ADMIN_FORCED, now);
  }

  async forceEndForUser(userId: number) {
    const now = this.clock.now();
    return this.prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId]);
      const active = await tx.session.findFirst({ where: { userId, status: SessionStatus.ACTIVE } });
      if (!active) return null;
      await lockSession(tx, active.id);
      return this.endLocked(tx, active, now, SessionEndReason.ADMIN_FORCED, now);
    });
  }

  /** Closes ACTIVE sessions whose PC stopped sending heartbeats. Returns the number closed. */
  async closeStaleSessions(): Promise<number> {
    const now = this.clock.now();
    const cutoff = new Date(now.getTime() - this.config.sessionTimeoutSeconds * 1000);
    const stale = await this.prisma.session.findMany({
      where: { status: SessionStatus.ACTIVE, lastHeartbeatAt: { lt: cutoff } },
      select: { id: true, userId: true },
    });
    let closed = 0;
    for (const { id, userId } of stale) {
      const ended = await this.prisma.$transaction(async (tx) => {
        await lockUsers(tx, [userId]);
        await lockSession(tx, id);
        const s = await tx.session.findUniqueOrThrow({ where: { id } });
        if (s.status !== SessionStatus.ACTIVE || s.lastHeartbeatAt >= cutoff) return false;
        await this.endLocked(tx, s, now, SessionEndReason.TIMEOUT, this.probableEnd(s, now));
        return true;
      });
      if (ended) closed++;
    }
    if (closed) this.logger.log(`Closed ${closed} stale session(s)`);
    return closed;
  }

  // ---------------------------------------------------------------- internals

  private async billHeartbeat(sessionId: number, now: Date): Promise<SessionState | null> {
    return this.prisma.$transaction(async (tx) => {
      const s0 = await tx.session.findUnique({ where: { id: sessionId } });
      if (!s0) return null;
      await lockUsers(tx, [s0.userId]);
      await lockSession(tx, sessionId);
      const s = await tx.session.findUniqueOrThrow({ where: { id: sessionId }, include: { user: true, pc: true } });
      if (s.status !== SessionStatus.ACTIVE) return this.toState(s, s.user.balanceSeconds, s.user);

      const charged = await this.charge(tx, s, now);
      if (charged.balanceSeconds === 0) {
        const ended = await this.endLocked(tx, charged.session, now, SessionEndReason.BALANCE_DEPLETED, now);
        return this.toState(ended.session, 0, s.user);
      }

      let updated = await tx.session.update({ where: { id: s.id }, data: { lastHeartbeatAt: now } });
      if (charged.balanceSeconds <= this.config.lowBalanceThresholdSeconds && !updated.lowBalanceAlerted) {
        await this.alerts.create(tx, {
          type: AlertType.LOW_BALANCE,
          userId: s.userId,
          pcId: s.pcId,
          sessionId: s.id,
          message: `${s.user.name} has ${Math.ceil(charged.balanceSeconds / 60)} min left on ${s.pc.name}`,
        });
        updated = await tx.session.update({ where: { id: s.id }, data: { lowBalanceAlerted: true } });
      }
      return this.toState(updated, charged.balanceSeconds, s.user);
    });
  }

  /**
   * Charges elapsed whole seconds in [lastBilledAt, upTo), capped by the balance.
   * Caller must hold the user and session locks.
   */
  private async charge(tx: Tx, session: Session, upTo: Date, opts: { consumeAll?: boolean } = {}) {
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    const elapsed = Math.max(0, secondsBetween(session.lastBilledAt, upTo));
    const amount = opts.consumeAll ? user.balanceSeconds : Math.min(elapsed, user.balanceSeconds);
    const balanceSeconds = user.balanceSeconds - amount;
    const lastBilledAt = new Date(session.lastBilledAt.getTime() + elapsed * 1000);

    if (amount > 0) {
      await tx.user.update({ where: { id: user.id }, data: { balanceSeconds } });
    }
    const updated = await tx.session.update({
      where: { id: session.id },
      data: { lastBilledAt, consumedSeconds: { increment: amount } },
    });
    await tx.balanceTransaction.update({
      where: { sessionId: session.id },
      data: { amountSeconds: -updated.consumedSeconds, balanceAfterSeconds: balanceSeconds },
    });
    return { session: updated, balanceSeconds, charged: amount };
  }

  /** Bills up to `billUpTo` and closes the session. Caller must hold user + session locks. */
  private async endLocked(
    tx: Tx,
    session: Session,
    now: Date,
    reason: SessionEndReason,
    billUpTo: Date,
    opts: { consumeAll?: boolean } = {},
  ) {
    const charged = await this.charge(tx, session, billUpTo, opts);
    let endReason = reason;
    if (
      charged.balanceSeconds === 0 &&
      (reason === SessionEndReason.LOGOUT || reason === SessionEndReason.TIMEOUT)
    ) {
      endReason = SessionEndReason.BALANCE_DEPLETED;
    }
    const ended = await tx.session.update({
      where: { id: session.id },
      data: { status: SessionStatus.ENDED, endedAt: now, endReason },
      include: { user: true, pc: true },
    });
    if (endReason === SessionEndReason.BALANCE_DEPLETED) {
      await this.alerts.create(tx, {
        type: AlertType.BALANCE_DEPLETED,
        userId: ended.userId,
        pcId: ended.pcId,
        sessionId: ended.id,
        message: `${ended.user.name} ran out of time on ${ended.pc.name}`,
      });
    }
    return { session: ended, balanceSeconds: charged.balanceSeconds };
  }

  /** When the PC went silent we assume it was used until the next expected heartbeat. */
  private probableEnd(session: Session, now: Date): Date {
    const t = session.lastHeartbeatAt.getTime() + this.config.heartbeatIntervalSeconds * 1000;
    return new Date(Math.min(t, now.getTime()));
  }

  private async verifyPcToken(token: string, pcNumber: number): Promise<PcSessionJwtPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<PcSessionJwtPayload>(token);
      return payload.typ === 'pc' && payload.pc === pcNumber ? payload : null;
    } catch {
      return null;
    }
  }

  private async findPc(number: number): Promise<Pc> {
    const pc = await this.prisma.pc.findUnique({ where: { number } });
    if (!pc) throw new ApiError(HttpStatus.NOT_FOUND, ErrorCode.PC_NOT_FOUND, `PC #${number} is not registered`);
    return pc;
  }

  private toState(s: Session, balanceSeconds: number, user: { id: number; name: string }): SessionState {
    return {
      id: s.id,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      endReason: s.endReason,
      consumedSeconds: s.consumedSeconds,
      balanceSeconds,
      user: { id: user.id, name: user.name },
    };
  }
}
