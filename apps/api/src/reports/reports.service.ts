import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { PrismaService } from '../common/prisma.service';
import { AppConfig } from '../config/app-config';
import { SessionsService } from '../sessions/sessions.service';
import { ReportRangeQuery, ReportSessionsQuery } from './reports.dto';

const MAX_RANGE_DAYS = 366;

/**
 * Date-range reports. Days are calendar days in APP_TIMEZONE; the range is inclusive.
 * A session is attributed to the day it STARTED; balance transactions to the day they were created.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly sessions: SessionsService,
  ) {}

  async summary(q: ReportRangeQuery) {
    this.validateRange(q.from, q.to);
    const b = this.boundsCte(q.from, q.to);
    const tz = this.config.timezone;

    const [totals] = await this.prisma.$queryRaw<
      { sessions: number; usage_seconds: number; unique_users: number }[]
    >`WITH ${b}
      SELECT count(*)::int AS sessions,
             coalesce(sum(s.consumed_seconds), 0)::int AS usage_seconds,
             count(DISTINCT s.user_id)::int AS unique_users
      FROM sessions s, b
      WHERE s.started_at >= b.s AND s.started_at < b.e`;

    const [money] = await this.prisma.$queryRaw<
      { topup_seconds: number; topup_count: number; deduction_seconds: number; deduction_count: number }[]
    >`WITH ${b}
      SELECT coalesce(sum(t.amount_seconds) FILTER (WHERE t.type = 'TOPUP'), 0)::int AS topup_seconds,
             count(*) FILTER (WHERE t.type = 'TOPUP')::int AS topup_count,
             coalesce(-sum(t.amount_seconds) FILTER (WHERE t.type = 'DEDUCTION'), 0)::int AS deduction_seconds,
             count(*) FILTER (WHERE t.type = 'DEDUCTION')::int AS deduction_count
      FROM balance_transactions t, b
      WHERE t.created_at >= b.s AND t.created_at < b.e`;

    const [alerts] = await this.prisma.$queryRaw<{ depleted: number; low_balance: number }[]>`WITH ${b}
      SELECT count(*) FILTER (WHERE a.type = 'BALANCE_DEPLETED')::int AS depleted,
             count(*) FILTER (WHERE a.type = 'LOW_BALANCE')::int AS low_balance
      FROM alerts a, b
      WHERE a.created_at >= b.s AND a.created_at < b.e`;

    const byDay = await this.prisma.$queryRaw<
      { date: string; sessions: number; usage_seconds: number; topup_seconds: number; deduction_seconds: number }[]
    >`WITH ${b},
      days AS (
        SELECT d::date AS day FROM generate_series(${q.from}::date, ${q.to}::date, interval '1 day') AS d
      ),
      sess AS (
        SELECT ((s.started_at AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::date AS day,
               count(*)::int AS sessions, sum(s.consumed_seconds)::int AS usage_seconds
        FROM sessions s, b WHERE s.started_at >= b.s AND s.started_at < b.e
        GROUP BY 1
      ),
      tx AS (
        SELECT ((t.created_at AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::date AS day,
               coalesce(sum(t.amount_seconds) FILTER (WHERE t.type = 'TOPUP'), 0)::int AS topup_seconds,
               coalesce(-sum(t.amount_seconds) FILTER (WHERE t.type = 'DEDUCTION'), 0)::int AS deduction_seconds
        FROM balance_transactions t, b WHERE t.created_at >= b.s AND t.created_at < b.e
        GROUP BY 1
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
             coalesce(sess.sessions, 0)::int AS sessions,
             coalesce(sess.usage_seconds, 0)::int AS usage_seconds,
             coalesce(tx.topup_seconds, 0)::int AS topup_seconds,
             coalesce(tx.deduction_seconds, 0)::int AS deduction_seconds
      FROM days
      LEFT JOIN sess ON sess.day = days.day
      LEFT JOIN tx ON tx.day = days.day
      ORDER BY days.day`;

    const byUser = await this.prisma.$queryRaw<
      {
        user_id: number;
        name: string;
        deleted: boolean;
        sessions: number;
        usage_seconds: number;
        topup_seconds: number;
        deduction_seconds: number;
      }[]
    >`WITH ${b},
      sess AS (
        SELECT s.user_id, count(*)::int AS sessions, sum(s.consumed_seconds)::int AS usage_seconds
        FROM sessions s, b WHERE s.started_at >= b.s AND s.started_at < b.e
        GROUP BY s.user_id
      ),
      tx AS (
        SELECT t.user_id,
               coalesce(sum(t.amount_seconds) FILTER (WHERE t.type = 'TOPUP'), 0)::int AS topup_seconds,
               coalesce(-sum(t.amount_seconds) FILTER (WHERE t.type = 'DEDUCTION'), 0)::int AS deduction_seconds
        FROM balance_transactions t, b
        WHERE t.created_at >= b.s AND t.created_at < b.e AND t.type IN ('TOPUP', 'DEDUCTION')
        GROUP BY t.user_id
      )
      SELECT u.id AS user_id, u.name, (u.deleted_at IS NOT NULL) AS deleted,
             coalesce(sess.sessions, 0)::int AS sessions,
             coalesce(sess.usage_seconds, 0)::int AS usage_seconds,
             coalesce(tx.topup_seconds, 0)::int AS topup_seconds,
             coalesce(tx.deduction_seconds, 0)::int AS deduction_seconds
      FROM users u
      LEFT JOIN sess ON sess.user_id = u.id
      LEFT JOIN tx ON tx.user_id = u.id
      WHERE sess.user_id IS NOT NULL OR tx.user_id IS NOT NULL
      ORDER BY usage_seconds DESC, topup_seconds DESC, u.name`;

    const byPc = await this.prisma.$queryRaw<
      { pc_id: number; number: number; name: string; sessions: number; usage_seconds: number; unique_users: number }[]
    >`WITH ${b},
      sess AS (
        SELECT s.pc_id, count(*)::int AS sessions, sum(s.consumed_seconds)::int AS usage_seconds,
               count(DISTINCT s.user_id)::int AS unique_users
        FROM sessions s, b WHERE s.started_at >= b.s AND s.started_at < b.e
        GROUP BY s.pc_id
      )
      SELECT p.id AS pc_id, p.number, p.name,
             coalesce(sess.sessions, 0)::int AS sessions,
             coalesce(sess.usage_seconds, 0)::int AS usage_seconds,
             coalesce(sess.unique_users, 0)::int AS unique_users
      FROM pcs p LEFT JOIN sess ON sess.pc_id = p.id
      ORDER BY p.number`;

    return {
      from: q.from,
      to: q.to,
      timezone: tz,
      totals: {
        sessions: totals.sessions,
        usageSeconds: totals.usage_seconds,
        uniqueUsers: totals.unique_users,
        topupSeconds: money.topup_seconds,
        topupCount: money.topup_count,
        deductionSeconds: money.deduction_seconds,
        deductionCount: money.deduction_count,
        depletedAlerts: alerts.depleted,
        lowBalanceAlerts: alerts.low_balance,
      },
      byDay: byDay.map((d) => ({
        date: d.date,
        sessions: d.sessions,
        usageSeconds: d.usage_seconds,
        topupSeconds: d.topup_seconds,
        deductionSeconds: d.deduction_seconds,
      })),
      byUser: byUser.map((u) => ({
        userId: u.user_id,
        name: u.name,
        deleted: u.deleted,
        sessions: u.sessions,
        usageSeconds: u.usage_seconds,
        topupSeconds: u.topup_seconds,
        deductionSeconds: u.deduction_seconds,
      })),
      byPc: byPc.map((p) => ({
        pcId: p.pc_id,
        number: p.number,
        name: p.name,
        sessions: p.sessions,
        usageSeconds: p.usage_seconds,
        uniqueUsers: p.unique_users,
      })),
    };
  }

  async sessionsInRange(q: ReportSessionsQuery) {
    this.validateRange(q.from, q.to);
    const [bounds] = await this.prisma.$queryRaw<{ s: string; e: string }[]>`WITH ${this.boundsCte(q.from, q.to)}
      SELECT to_char(b.s, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS s,
             to_char(b.e, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS e
      FROM b`;
    return this.sessions.list(
      {
        startedAt: { gte: new Date(bounds.s), lt: new Date(bounds.e) },
        ...(q.userId ? { userId: q.userId } : {}),
        ...(q.pcId ? { pcId: q.pcId } : {}),
      },
      q,
    );
  }

  /** CTE `b(s, e)`: UTC timestamps of [from 00:00, to+1 00:00) in the app timezone. */
  private boundsCte(from: string, to: string) {
    const tz = this.config.timezone;
    return Prisma.sql`b AS (
      SELECT ((${from}::date)::timestamp AT TIME ZONE ${tz}) AT TIME ZONE 'UTC' AS s,
             (((${to}::date) + 1)::timestamp AT TIME ZONE ${tz}) AT TIME ZONE 'UTC' AS e
    )`;
  }

  private validateRange(from: string, to: string) {
    const f = Date.parse(`${from}T00:00:00Z`);
    const t = Date.parse(`${to}T00:00:00Z`);
    if (Number.isNaN(f) || Number.isNaN(t) || f > t || (t - f) / 86_400_000 > MAX_RANGE_DAYS) {
      throw ApiError.badRequest(
        ErrorCode.INVALID_DATE_RANGE,
        `Invalid date range (from <= to, at most ${MAX_RANGE_DAYS} days)`,
      );
    }
  }
}
