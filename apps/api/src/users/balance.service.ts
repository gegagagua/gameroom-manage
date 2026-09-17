import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { toTransactionDto, toUserDto } from '../common/mappers';
import { paginate, PaginationQuery } from '../common/pagination';
import { lockUsers, PrismaService } from '../common/prisma.service';
import { hoursToSeconds } from '../common/time';
import { AdjustBalanceDto } from './users.dto';

/** Admin-only balance management. Session consumption is handled by BillingService. */
@Injectable()
export class BalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  async adjust(userId: number, dto: AdjustBalanceDto, adminId: number) {
    const seconds = hoursToSeconds(dto.hours);
    if (dto.operation !== 'set' && seconds <= 0) {
      throw ApiError.badRequest(ErrorCode.VALIDATION_FAILED, 'Amount must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      await lockUsers(tx, [userId]);
      const user = await tx.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user) throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');

      let delta: number;
      if (dto.operation === 'add') delta = seconds;
      else if (dto.operation === 'subtract') {
        if (seconds > user.balanceSeconds) {
          throw ApiError.badRequest(ErrorCode.INSUFFICIENT_BALANCE, 'Cannot subtract more than the current balance', {
            balanceSeconds: user.balanceSeconds,
          });
        }
        delta = -seconds;
      } else delta = seconds - user.balanceSeconds;

      if (delta === 0) return { user: toUserDto(user), transaction: null };

      const balanceSeconds = user.balanceSeconds + delta;
      const updated = await tx.user.update({ where: { id: userId }, data: { balanceSeconds } });
      const transaction = await tx.balanceTransaction.create({
        data: {
          userId,
          type: delta > 0 ? TransactionType.TOPUP : TransactionType.DEDUCTION,
          amountSeconds: delta,
          balanceAfterSeconds: balanceSeconds,
          note: dto.note || null,
          adminId,
          createdAt: this.clock.now(),
        },
        include: { admin: true },
      });
      return { user: toUserDto(updated), transaction: toTransactionDto(transaction) };
    });
  }

  async listTransactions(userId: number, q: PaginationQuery) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.balanceTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { admin: true, session: { include: { pc: true } } },
        ...paginate(q),
      }),
      this.prisma.balanceTransaction.count({ where }),
    ]);
    return { items: items.map(toTransactionDto), total, page: q.page, pageSize: q.pageSize };
  }
}
