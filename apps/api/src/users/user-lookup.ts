import type { PrismaService, Tx } from '../common/prisma.service';
import { normalizeEmail, normalizePhone } from '../common/time';

/** Finds a non-deleted user by email (if the login contains "@"), phone or username. */
export async function findUserByLogin(db: PrismaService | Tx, login: string) {
  const value = login.trim();
  if (!value) return null;
  if (value.includes('@')) {
    return db.user.findFirst({ where: { email: normalizeEmail(value), deletedAt: null } });
  }
  const phone = normalizePhone(value);
  if (phone) {
    const byPhone = await db.user.findFirst({ where: { phone, deletedAt: null } });
    if (byPhone) return byPhone;
  }
  // Legacy/imported customers sign in with the username they used in the old system.
  return db.user.findFirst({ where: { username: { equals: value, mode: 'insensitive' }, deletedAt: null } });
}
