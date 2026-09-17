import type { PrismaService, Tx } from '../common/prisma.service';
import { normalizeEmail, normalizePhone } from '../common/time';

/** Finds a non-deleted user by email (if the login contains "@") or phone. */
export function findUserByLogin(db: PrismaService | Tx, login: string) {
  const value = login.trim();
  if (value.includes('@')) {
    return db.user.findFirst({ where: { email: normalizeEmail(value), deletedAt: null } });
  }
  const phone = normalizePhone(value);
  if (!phone) return Promise.resolve(null);
  return db.user.findFirst({ where: { phone, deletedAt: null } });
}
