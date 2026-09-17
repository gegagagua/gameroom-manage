/**
 * Optional demo data for local development: a few customers with different balances.
 * Idempotent (skips users whose email already exists). Password for all: demo123
 *
 *   npm run db:seed-demo
 */
import { PrismaClient, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USERS = [
  { name: 'გიორგი ბერიძე', email: 'giorgi@demo.local', phone: '+995555000001', hours: 3 },
  { name: 'ნინო კაპანაძე', email: 'nino@demo.local', phone: '+995555000002', hours: 1.2 },
  { name: 'ლუკა მაისურაძე', email: 'luka@demo.local', phone: '+995555000003', hours: 0.1 },
  { name: 'დავით გელაშვილი', email: 'davit@demo.local', phone: '+995555000004', hours: 0 },
  { name: 'Ana Lomidze', email: 'ana@demo.local', phone: '+995555000005', hours: 5 },
];

async function main() {
  const admin = await prisma.admin.findFirst();
  if (!admin) throw new Error('No admin yet — start the API once so it seeds the admin from .env');
  const passwordHash = await bcrypt.hash('demo123', 10);

  for (const u of DEMO_USERS) {
    if (await prisma.user.findUnique({ where: { email: u.email } })) {
      console.log(`skip ${u.email}`);
      continue;
    }
    const balanceSeconds = Math.round(u.hours * 3600);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: u.name, email: u.email, phone: u.phone, passwordHash, balanceSeconds },
      });
      if (balanceSeconds > 0) {
        await tx.balanceTransaction.create({
          data: {
            userId: user.id,
            type: TransactionType.TOPUP,
            amountSeconds: balanceSeconds,
            balanceAfterSeconds: balanceSeconds,
            note: 'Demo',
            adminId: admin.id,
          },
        });
      }
    });
    console.log(`created ${u.email} (${u.hours} h)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
