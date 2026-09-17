import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';

const ROUNDS = 10;

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Returns a URL-safe random token and its sha256 hash (only the hash is stored). */
export function createResetToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256(token) };
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
