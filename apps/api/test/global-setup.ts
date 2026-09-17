import { execSync } from 'node:child_process';
import { join } from 'node:path';

/** Resets the test database and applies all migrations once before the suite. */
export default function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://g.gagua@localhost:5432/game_room_test?schema=public';
  execSync('npx prisma migrate reset --force --skip-seed --skip-generate', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes' },
    stdio: 'pipe',
  });
}
