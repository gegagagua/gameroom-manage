import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export type Tx = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

/**
 * Row locks. Lock order used across the codebase to avoid deadlocks:
 *   pcs → users (ascending id) → sessions
 */
export async function lockPc(tx: Tx, pcId: number) {
  await tx.$queryRaw`SELECT id FROM pcs WHERE id = ${pcId} FOR UPDATE`;
}

export async function lockUsers(tx: Tx, userIds: number[]) {
  const ids = [...new Set(userIds)].sort((a, b) => a - b);
  for (const id of ids) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
  }
}

export async function lockSession(tx: Tx, sessionId: number) {
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${sessionId} FOR UPDATE`;
}
