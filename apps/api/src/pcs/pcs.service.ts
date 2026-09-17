import { Injectable } from '@nestjs/common';
import { PcCommand, SessionStatus } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { lockPc, PrismaService } from '../common/prisma.service';
import { AppConfig } from '../config/app-config';
import { BillingService } from '../sessions/billing.service';

@Injectable()
export class PcsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly config: AppConfig,
    private readonly billing: BillingService,
  ) {}

  async list() {
    const now = this.clock.now();
    const pcs = await this.prisma.pc.findMany({
      orderBy: { number: 'asc' },
      include: { sessions: { where: { status: SessionStatus.ACTIVE }, include: { user: true }, take: 1 } },
    });
    const items = pcs.map((pc) => {
      const s = pc.sessions[0];
      return {
        id: pc.id,
        number: pc.number,
        name: pc.name,
        online: !!pc.lastSeenAt && now.getTime() - pc.lastSeenAt.getTime() <= this.config.pcOnlineWindowSeconds * 1000,
        lastSeenAt: pc.lastSeenAt,
        appVersion: pc.appVersion,
        ipAddress: pc.ipAddress,
        pendingCommand: pc.pendingCommand,
        commandIssuedAt: pc.commandIssuedAt,
        currentSession: s
          ? {
              id: s.id,
              game: pc.currentGame,
              startedAt: s.startedAt,
              lastHeartbeatAt: s.lastHeartbeatAt,
              consumedSeconds: s.consumedSeconds,
              user: { id: s.user.id, name: s.user.name, phone: s.user.phone, balanceSeconds: s.user.balanceSeconds },
            }
          : null,
      };
    });
    return {
      serverTime: now,
      heartbeatIntervalSeconds: this.config.heartbeatIntervalSeconds,
      lowBalanceThresholdSeconds: this.config.lowBalanceThresholdSeconds,
      summary: {
        total: items.length,
        online: items.filter((p) => p.online).length,
        busy: items.filter((p) => p.currentSession).length,
      },
      items,
    };
  }

  async rename(id: number, name: string) {
    await this.ensureExists(id);
    await this.prisma.pc.update({ where: { id }, data: { name } });
    return { ok: true };
  }

  /**
   * Queues a command for the PC (delivered in its next heartbeat) and immediately ends the active
   * session so billing stops now rather than at the next heartbeat.
   */
  async issueCommand(id: number, command: PcCommand) {
    await this.ensureExists(id);
    const now = this.clock.now();
    const ended = await this.prisma.$transaction(async (tx) => {
      await lockPc(tx, id);
      await tx.pc.update({ where: { id }, data: { pendingCommand: command, commandIssuedAt: now, currentGame: null } });
      return this.billing.forceEndOnPcLocked(tx, id, now);
    });
    return { ok: true, endedSessionId: ended?.session.id ?? null };
  }

  async cancelCommand(id: number) {
    await this.ensureExists(id);
    await this.prisma.pc.update({ where: { id }, data: { pendingCommand: null, commandIssuedAt: null } });
    return { ok: true };
  }

  private async ensureExists(id: number) {
    const pc = await this.prisma.pc.findUnique({ where: { id } });
    if (!pc) throw ApiError.notFound(ErrorCode.PC_NOT_FOUND, 'PC not found');
    return pc;
  }
}
