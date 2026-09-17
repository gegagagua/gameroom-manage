/**
 * Imports customers from the old SENET/Enestech admin panel into this app.
 *
 * Input: the HTML of the users grid saved from the old panel
 * (club-mirage.admin.enes.tech → Users → copy the <cdk-table> element), e.g. export.html.
 *
 *   npm run db:import-legacy -w @grm/api -- ../../export.html --dry-run
 *   npm run db:import-legacy -w @grm/api -- ../../export.html
 *
 * Flags:
 *   --gel-per-hour=10   old money balance → time (default 10 GEL = 1 hour)
 *   --dry-run           parse + report only, write nothing
 *   --update            refresh name/email/phone/username of already imported users
 *                       (balance is NEVER touched on re-run)
 *
 * Rules:
 *   - "Staff" rows (old panel admins) are skipped — this app keeps admins in a separate table.
 *   - Imported customers sign in with their old username; the password is set to the username.
 *   - The old panel allows several accounts on one email; ours does not, so the extra
 *     account keeps the same inbox via a "+legacy<id>" tag (user+legacy157@gmail.com).
 *   - Idempotent: a username that already exists is skipped (or refreshed with --update).
 */
import { PrismaClient, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

const COLUMNS = [
  'dic_user-login',
  'email',
  'account_type',
  'status',
  'account_amount',
  'create_date',
  'name',
  'last_name',
  'phone',
] as const;

type Column = (typeof COLUMNS)[number];
type RawRow = Record<Column, string> & { legacyId: number | null };

interface LegacyUser {
  legacyId: number | null;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  gel: number;
  balanceSeconds: number;
  createdAt: Date;
  isActive: boolean;
  notes: string[];
}

const stripTags = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

function parseRows(html: string): RawRow[] {
  return html
    .split('<cdk-row')
    .slice(1)
    .map((row) => {
      const out = {} as RawRow;
      for (const col of COLUMNS) {
        const match = row.match(new RegExp(`<cdk-cell[^>]*cdk-column-${col}[ "][^>]*>([\\s\\S]*?)</cdk-cell>`));
        out[col] = match ? stripTags(match[1]) : '';
      }
      const id = row.match(/href="\/users\/(-?\d+)"/);
      out.legacyId = id ? Number(id[1]) : null;
      return out;
    });
}

/** Old panel prints M/D/YYYY; keep the calendar day (UTC noon avoids timezone drift). */
function parseDate(value: string): Date | null {
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, month, day, year] = m;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Keeps a leading "+" and digits only; "" / "+995" (country code only) means "no phone". */
function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length <= 5) return null;
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

/** Auto-generated old-panel logins look like "2UyGqd0CObzys6pEZT7x" — a real login never does. */
const isGeneratedUsername = (username: string) =>
  /^[A-Za-z0-9]{20}$/.test(username) && /[A-Z]/.test(username) && /[a-z]/.test(username) && /\d/.test(username);

function tagEmail(email: string, legacyId: number | null): string {
  const [local, domain] = email.split('@');
  return `${local}+legacy${legacyId ?? 'dup'}@${domain}`;
}

function toLegacyUsers(rows: RawRow[], gelPerHour: number) {
  const skipped: { username: string; reason: string }[] = [];
  const users: LegacyUser[] = [];

  for (const row of rows) {
    const username = row['dic_user-login'].trim();
    if (!username) {
      skipped.push({ username: '(empty)', reason: 'no username' });
      continue;
    }
    if (row.account_type.trim() === 'Staff') {
      skipped.push({ username, reason: 'staff account of the old panel' });
      continue;
    }
    const email = row.email.trim().toLowerCase();
    if (!email.includes('@')) {
      skipped.push({ username, reason: `invalid email "${row.email}"` });
      continue;
    }
    const gel = Number(row.account_amount.replace(/,/g, '')) || 0;
    const createdAt = parseDate(row.create_date.trim());
    const notes: string[] = [];
    if (!createdAt) notes.push(`unparsable registration date "${row.create_date}" → today`);
    const fullName = [row.name.trim(), row.last_name.trim()].filter(Boolean).join(' ').trim();

    users.push({
      legacyId: row.legacyId,
      username,
      name: (fullName || username).slice(0, 100),
      email,
      phone: normalizePhone(row.phone),
      gel,
      balanceSeconds: Math.round((gel / gelPerHour) * 3600),
      createdAt: createdAt ?? new Date(),
      isActive: row.status.trim().toLowerCase() !== 'blocked',
      notes,
    });
  }

  // One email can carry several old accounts; ours is unique → tag the generated ones.
  const byEmail = new Map<string, LegacyUser[]>();
  for (const u of users) byEmail.set(u.email, [...(byEmail.get(u.email) ?? []), u]);
  for (const [email, group] of byEmail) {
    if (group.length < 2) continue;
    const primary =
      group.find((u) => !isGeneratedUsername(u.username)) ??
      [...group].sort((a, b) => (b.legacyId ?? 0) - (a.legacyId ?? 0))[0];
    for (const u of group) {
      if (u === primary) continue;
      u.email = tagEmail(email, u.legacyId);
      u.notes.push(`duplicate of ${email} (kept by "${primary.username}") → ${u.email}`);
    }
  }

  // Same phone on two old accounts: only the first keeps it (phone is unique here).
  const seenPhones = new Set<string>();
  for (const u of users) {
    if (!u.phone) continue;
    if (seenPhones.has(u.phone)) {
      u.notes.push(`phone ${u.phone} already used by another imported user → cleared`);
      u.phone = null;
    } else {
      seenPhones.add(u.phone);
    }
  }

  return { users, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--')) ?? '../../export.html';
  const dryRun = args.includes('--dry-run');
  const update = args.includes('--update');
  const gelPerHour = Number(args.find((a) => a.startsWith('--gel-per-hour='))?.split('=')[1] ?? 10);
  if (!Number.isFinite(gelPerHour) || gelPerHour <= 0) throw new Error('--gel-per-hour must be a positive number');

  const path = resolve(process.cwd(), file);
  const { users, skipped } = toLegacyUsers(parseRows(readFileSync(path, 'utf8')), gelPerHour);

  console.log(`source: ${path}`);
  console.log(`rate:   ${gelPerHour} GEL = 1 hour${dryRun ? '   [DRY RUN — nothing is written]' : ''}`);
  console.log(`parsed: ${users.length} customers, ${skipped.length} skipped rows\n`);
  for (const s of skipped) console.log(`  skip   ${s.username} — ${s.reason}`);

  const admin = await prisma.admin.findFirst({ orderBy: { id: 'asc' } });
  if (!admin && !dryRun) throw new Error('No admin yet — start the API once so it seeds the admin from .env');

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const problems: string[] = [];

  for (const u of users) {
    for (const note of u.notes) console.log(`  note   ${u.username} — ${note}`);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: u.username }, { email: u.email }], deletedAt: null },
    });

    // Never steal a phone/email that another (non-imported) user already owns.
    let phone = u.phone;
    if (phone) {
      const phoneOwner = await prisma.user.findFirst({ where: { phone, deletedAt: null } });
      if (phoneOwner && phoneOwner.id !== existing?.id) {
        problems.push(`${u.username}: phone ${phone} belongs to user #${phoneOwner.id} → imported without phone`);
        phone = null;
      }
    }

    if (existing) {
      if (!update) {
        unchanged += 1;
        continue;
      }
      if (!dryRun) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { username: u.username, name: u.name, email: u.email, phone, isActive: u.isActive },
        });
      }
      updated += 1;
      console.log(`  update ${u.username} (#${existing.id}) — balance left untouched`);
      continue;
    }

    const hours = (u.balanceSeconds / 3600).toFixed(2);
    if (!dryRun) {
      const passwordHash = await bcrypt.hash(u.username, 10);
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: u.username,
            name: u.name,
            email: u.email,
            phone,
            passwordHash,
            balanceSeconds: u.balanceSeconds,
            isActive: u.isActive,
            createdAt: u.createdAt,
          },
        });
        if (u.balanceSeconds > 0) {
          await tx.balanceTransaction.create({
            data: {
              userId: user.id,
              type: TransactionType.TOPUP,
              amountSeconds: u.balanceSeconds,
              balanceAfterSeconds: u.balanceSeconds,
              note: `Legacy import (SENET #${u.legacyId ?? '?'}): ${u.gel.toFixed(2)} GEL @ ${gelPerHour} GEL/h`,
              adminId: admin!.id,
              createdAt: u.createdAt,
            },
          });
        }
      });
    }
    created += 1;
    console.log(`  create ${u.username.padEnd(22)} ${u.email.padEnd(34)} ${u.gel.toFixed(2)} GEL → ${hours} h`);
  }

  for (const p of problems) console.log(`  warn   ${p}`);
  const totalSeconds = users.reduce((sum, u) => sum + u.balanceSeconds, 0);
  console.log(
    `\ncreated ${created}, updated ${updated}, already there ${unchanged}, skipped ${skipped.length}` +
      `\nbalance in this file: ${users.reduce((s, u) => s + u.gel, 0).toFixed(2)} GEL = ${(totalSeconds / 3600).toFixed(2)} h`,
  );
  if (dryRun) console.log('DRY RUN — nothing was written.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
