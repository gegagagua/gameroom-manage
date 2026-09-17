import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { toSessionDto } from '../common/mappers';
import { paginate, PaginationQuery } from '../common/pagination';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(where: Prisma.SessionWhereInput, q: PaginationQuery) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.session.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: { pc: true, user: true },
        ...paginate(q),
      }),
      this.prisma.session.count({ where }),
    ]);
    return { items: items.map(toSessionDto), total, page: q.page, pageSize: q.pageSize };
  }
}
