import { Injectable } from '@nestjs/common';
import { AlertType, Prisma } from '@prisma/client';
import { ApiError } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { toAlertDto } from '../common/mappers';
import { paginate } from '../common/pagination';
import { PrismaService, Tx } from '../common/prisma.service';
import { ListAlertsQuery } from './alerts.dto';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  create(tx: Tx, data: { type: AlertType; userId: number; pcId?: number | null; sessionId?: number | null; message: string }) {
    return tx.alert.create({ data: { ...data, createdAt: this.clock.now() } });
  }

  async list(q: ListAlertsQuery) {
    const where: Prisma.AlertWhereInput = {
      ...(q.status === 'open' ? { acknowledgedAt: null } : {}),
      ...(q.afterId ? { id: { gt: q.afterId } } : {}),
    };
    const [items, total, openCount] = await this.prisma.$transaction([
      this.prisma.alert.findMany({
        where,
        orderBy: { id: 'desc' },
        include: { user: true, pc: true, acknowledgedBy: true },
        ...paginate(q),
      }),
      this.prisma.alert.count({ where }),
      this.prisma.alert.count({ where: { acknowledgedAt: null } }),
    ]);
    return { items: items.map(toAlertDto), total, page: q.page, pageSize: q.pageSize, openCount };
  }

  async acknowledge(id: number, adminId: number) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw ApiError.notFound();
    if (!alert.acknowledgedAt) {
      await this.prisma.alert.update({ where: { id }, data: { acknowledgedAt: this.clock.now(), acknowledgedById: adminId } });
    }
    return { ok: true };
  }

  async acknowledgeAll(adminId: number) {
    const { count } = await this.prisma.alert.updateMany({
      where: { acknowledgedAt: null },
      data: { acknowledgedAt: this.clock.now(), acknowledgedById: adminId },
    });
    return { ok: true, count };
  }
}
