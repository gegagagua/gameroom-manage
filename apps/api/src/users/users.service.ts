import { Injectable } from '@nestjs/common';
import { Prisma, SessionStatus, TransactionType } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { toUserDto } from '../common/mappers';
import { paginate } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { hoursToSeconds, normalizeEmail, normalizePhone } from '../common/time';
import { BillingService } from '../sessions/billing.service';
import { CreateUserDto, ListUsersQuery, UpdateUserDto } from './users.dto';

const activeSessionInclude = {
  sessions: { where: { status: SessionStatus.ACTIVE }, include: { pc: true }, take: 1 },
} satisfies Prisma.UserInclude;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly clock: ClockService,
  ) {}

  async list(q: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q.status === 'active' ? { isActive: true } : q.status === 'inactive' ? { isActive: false } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { username: { contains: q.search, mode: 'insensitive' } },
              { email: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: normalizePhone(q.search) || q.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, include: activeSessionInclude, ...paginate(q) }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((u) => toUserDto(u, u.sessions[0])), total, page: q.page, pageSize: q.pageSize };
  }

  async create(dto: CreateUserDto, adminId: number) {
    const email = normalizeEmail(dto.email);
    const phone = dto.phone ? normalizePhone(dto.phone) : null;
    const username = dto.username ?? null;
    await this.assertUnique({ email, phone, username });
    const balanceSeconds = hoursToSeconds(dto.balanceHours ?? 0);
    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: dto.name, username, email, phone, passwordHash, balanceSeconds, isActive: dto.isActive ?? true },
      });
      if (balanceSeconds > 0) {
        await tx.balanceTransaction.create({
          data: {
            userId: created.id,
            type: TransactionType.TOPUP,
            amountSeconds: balanceSeconds,
            balanceAfterSeconds: balanceSeconds,
            note: 'Initial balance',
            adminId,
          },
        });
      }
      return created;
    });
    return toUserDto(user, null);
  }

  async get(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: activeSessionInclude });
    if (!user) throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    return { ...toUserDto(user, user.sessions[0]), stats: await this.stats(id) };
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');

    const email = dto.email !== undefined ? normalizeEmail(dto.email) : undefined;
    const phone = dto.phone !== undefined ? (dto.phone ? normalizePhone(dto.phone) : null) : undefined;
    const username = dto.username;
    await this.assertUnique({ email, phone, username }, id);

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(username !== undefined ? { username } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    };
    if (dto.password) {
      data.passwordHash = await hashPassword(dto.password);
      data.tokenVersion = { increment: 1 };
    }
    if (dto.isActive === false && existing.isActive) {
      data.tokenVersion = { increment: 1 };
    }
    await this.prisma.user.update({ where: { id }, data });

    // Deactivated users are kicked off their PC; the desktop learns it on its next heartbeat.
    if (dto.isActive === false) await this.billing.forceEndForUser(id);
    return this.get(id);
  }

  /** Soft delete: history and reports keep the user; email/phone are freed for reuse. */
  async remove(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    const active = await this.prisma.session.findFirst({ where: { userId: id, status: SessionStatus.ACTIVE } });
    if (active) throw ApiError.conflict(ErrorCode.USER_HAS_ACTIVE_SESSION, 'User has an active PC session');

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: this.clock.now(),
        isActive: false,
        email: `deleted:${id}:${user.email}`,
        phone: user.phone ? `deleted:${id}:${user.phone}` : null,
        username: user.username ? `deleted:${id}:${user.username}`.slice(0, 64) : null,
        tokenVersion: { increment: 1 },
      },
    });
    return { ok: true };
  }

  async stats(userId: number) {
    const [sessions, topups] = await this.prisma.$transaction([
      this.prisma.session.aggregate({ where: { userId }, _count: { _all: true }, _sum: { consumedSeconds: true } }),
      this.prisma.balanceTransaction.aggregate({
        where: { userId, type: TransactionType.TOPUP },
        _sum: { amountSeconds: true },
      }),
    ]);
    return {
      sessionsCount: sessions._count._all,
      consumedSeconds: sessions._sum.consumedSeconds ?? 0,
      toppedUpSeconds: topups._sum.amountSeconds ?? 0,
    };
  }

  private async assertUnique(
    fields: { email?: string | null; phone?: string | null; username?: string | null },
    excludeId?: number,
  ) {
    const { email, phone, username } = fields;
    const notSelf = excludeId ? { id: { not: excludeId } } : {};
    if (email && (await this.prisma.user.findFirst({ where: { email, ...notSelf } }))) {
      throw ApiError.conflict(ErrorCode.EMAIL_TAKEN, 'Email is already in use');
    }
    if (phone && (await this.prisma.user.findFirst({ where: { phone, ...notSelf } }))) {
      throw ApiError.conflict(ErrorCode.PHONE_TAKEN, 'Phone is already in use');
    }
    if (username && (await this.prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' }, ...notSelf } }))) {
      throw ApiError.conflict(ErrorCode.USERNAME_TAKEN, 'Username is already in use');
    }
  }
}
