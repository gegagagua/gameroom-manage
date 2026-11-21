import { scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password that closes the kiosk app from the lock screen. Works offline (no API call).
 * Only a salted scrypt hash is shipped — to change it, regenerate both values:
 *   node -e "const c=require('crypto');const s=c.randomBytes(16).toString('hex');console.log(s,c.scryptSync('NEW',s,32).toString('hex'))"
 */
const SALT = '876479f846581dac4c09c53c3b1c2045';
const HASH = Buffer.from('f1182a9456a3d12ab5c0cc9bf91ace7fd04dff7065627ba31e1050fa4d47d6f4', 'hex');

/** After this many wrong attempts the button is locked for LOCK_MS. */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

let failures = 0;
let lockedUntil = 0;

export type ExitCheck = 'ok' | 'wrong' | 'locked';

export function checkExitPassword(password: string): ExitCheck {
  const now = Date.now();
  if (now < lockedUntil) return 'locked';
  const ok = timingSafeEqual(scryptSync(password, SALT, HASH.length), HASH);
  if (ok) {
    failures = 0;
    return 'ok';
  }
  failures += 1;
  if (failures >= MAX_ATTEMPTS) {
    failures = 0;
    lockedUntil = now + LOCK_MS;
    return 'locked';
  }
  return 'wrong';
}
