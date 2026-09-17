'use client';

import { errorMessage, formatDuration, secondsToHours, type Paginated, type ReportSummary, type SessionDto } from '@grm/shared';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { SessionsCard } from '@/components/history-tables';
import { useToast } from '@/components/toast';
import { Button, Card, Empty, Input, Loading, PageHeader, StatCard, Table, Td, Th } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { downloadCsv, formatDateLabel, formatDateTime, toYmd } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

type Preset = 'today' | 'yesterday' | 'last7' | 'thisMonth';

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const day = (offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return toYmd(d);
  };
  switch (p) {
    case 'today':
      return { from: day(0), to: day(0) };
    case 'yesterday':
      return { from: day(-1), to: day(-1) };
    case 'last7':
      return { from: day(-6), to: day(0) };
    case 'thisMonth':
      return { from: toYmd(new Date(now.getFullYear(), now.getMonth(), 1)), to: day(0) };
  }
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full min-w-24 overflow-hidden rounded-full bg-zinc-800">
      <div className={className ?? 'h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400'} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ReportsPage() {
  const { t, lang, errText } = useI18n();
  const toast = useToast();
  const [range, setRange] = useState(() => presetRange('today'));
  const [exporting, setExporting] = useState(false);
  const valid = !!range.from && !!range.to && range.from <= range.to;
  const { data, error, isLoading } = useSWR<ReportSummary>(valid ? withQuery('/reports/summary', range) : null);
  const h = lang === 'ka' ? 'სთ' : 'h';

  const exportSessions = async () => {
    setExporting(true);
    try {
      const rows: (string | number)[][] = [['id', 'user', 'pc', 'started', 'ended', 'consumed_hours', 'end_reason']];
      for (let page = 1; page <= 50; page++) {
        const res = await api<Paginated<SessionDto>>(withQuery('/reports/sessions', { ...range, page, pageSize: 200 }));
        for (const s of res.items) {
          rows.push([s.id, s.user?.name ?? '', s.pc?.name ?? '', s.startedAt, s.endedAt ?? '', secondsToHours(s.consumedSeconds), s.endReason ?? s.status]);
        }
        if (page * 200 >= res.total) break;
      }
      downloadCsv(`sessions_${range.from}_${range.to}.csv`, rows);
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setExporting(false);
    }
  };

  const maxDayUsage = data ? Math.max(0, ...data.byDay.map((d) => d.usageSeconds)) : 0;
  const maxPcUsage = data ? Math.max(0, ...data.byPc.map((p) => p.usageSeconds)) : 0;
  const maxUserUsage = data ? Math.max(0, ...data.byUser.map((u) => u.usageSeconds)) : 0;

  return (
    <>
      <PageHeader title={t('reports.title')} subtitle={data ? t('reports.tzNote', { tz: data.timezone }) : undefined} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Input label={t('reports.from')} type="date" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div className="w-44">
            <Input label={t('reports.to')} type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'yesterday', 'last7', 'thisMonth'] as Preset[]).map((p) => {
              const r = presetRange(p);
              const active = r.from === range.from && r.to === range.to;
              return (
                <Button key={p} variant={active ? 'primary' : 'secondary'} size="sm" onClick={() => setRange(r)}>
                  {t(`reports.${p}`)}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {!valid ? (
        <Empty>{errorMessage('INVALID_DATE_RANGE', lang)}</Empty>
      ) : error ? (
        <Card>
          <Empty>{errText(error)}</Empty>
        </Card>
      ) : isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label={t('reports.sessions')} value={data.totals.sessions} />
            <StatCard
              label={t('reports.usage')}
              value={formatDuration(data.totals.usageSeconds, lang)}
              sub={`${secondsToHours(data.totals.usageSeconds)} ${h}`}
              tone="violet"
            />
            <StatCard label={t('reports.uniqueUsers')} value={data.totals.uniqueUsers} />
            <StatCard
              label={t('reports.topups')}
              value={`${secondsToHours(data.totals.topupSeconds)} ${h}`}
              sub={t('reports.times', { n: data.totals.topupCount })}
              tone="green"
            />
            <StatCard
              label={t('reports.deductions')}
              value={`${secondsToHours(data.totals.deductionSeconds)} ${h}`}
              sub={t('reports.times', { n: data.totals.deductionCount })}
              tone="amber"
            />
            <StatCard label={t('reports.depleted')} value={data.totals.depletedAlerts} tone={data.totals.depletedAlerts ? 'red' : 'default'} />
          </div>

          <Card
            title={t('reports.byDay')}
            actions={
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  downloadCsv(`by_day_${data.from}_${data.to}.csv`, [
                    ['date', 'sessions', 'usage_hours', 'topup_hours', 'deduction_hours'],
                    ...data.byDay.map((d) => [d.date, d.sessions, secondsToHours(d.usageSeconds), secondsToHours(d.topupSeconds), secondsToHours(d.deductionSeconds)]),
                  ])
                }
              >
                ⬇ {t('common.exportCsv')}
              </Button>
            }
          >
            <Table>
              <thead>
                <tr>
                  <Th>{t('common.date')}</Th>
                  <Th className="text-right">{t('reports.sessions')}</Th>
                  <Th className="w-1/3">{t('reports.usage')}</Th>
                  <Th className="text-right">{t('reports.topups')}</Th>
                  <Th className="text-right">{t('reports.deductions')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.byDay.map((d) => (
                  <tr key={d.date}>
                    <Td className="whitespace-nowrap text-zinc-300">{formatDateLabel(d.date, lang)}</Td>
                    <Td className="text-right tabular-nums">{d.sessions}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Bar value={d.usageSeconds} max={maxDayUsage} />
                        <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-300">{formatDuration(d.usageSeconds, lang)}</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums text-emerald-300">{d.topupSeconds ? `${secondsToHours(d.topupSeconds)} ${h}` : '—'}</Td>
                    <Td className="text-right tabular-nums text-amber-300">{d.deductionSeconds ? `${secondsToHours(d.deductionSeconds)} ${h}` : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card
              title={t('reports.byUser')}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadCsv(`by_user_${data.from}_${data.to}.csv`, [
                      ['user_id', 'name', 'sessions', 'usage_hours', 'topup_hours', 'deduction_hours'],
                      ...data.byUser.map((u) => [u.userId, u.name, u.sessions, secondsToHours(u.usageSeconds), secondsToHours(u.topupSeconds), secondsToHours(u.deductionSeconds)]),
                    ])
                  }
                >
                  ⬇ {t('common.exportCsv')}
                </Button>
              }
            >
              {data.byUser.length === 0 ? (
                <Empty />
              ) : (
                <Table minWidth={420}>
                  <thead>
                    <tr>
                      <Th>{t('common.user')}</Th>
                      <Th className="text-right">{t('reports.sessions')}</Th>
                      <Th>{t('reports.usage')}</Th>
                      <Th className="text-right">{t('reports.topups')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUser.map((u) => (
                      <tr key={u.userId}>
                        <Td>
                          {u.deleted ? (
                            <span className="text-zinc-400">
                              {u.name} <span className="text-xs">{t('reports.deletedUser')}</span>
                            </span>
                          ) : (
                            <Link href={`/admin/users/${u.userId}`} className="text-white hover:text-violet-200">
                              {u.name}
                            </Link>
                          )}
                        </Td>
                        <Td className="text-right tabular-nums">{u.sessions}</Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <Bar value={u.usageSeconds} max={maxUserUsage} />
                            <span className="w-20 shrink-0 text-right text-xs tabular-nums">{formatDuration(u.usageSeconds, lang)}</span>
                          </div>
                        </Td>
                        <Td className="text-right tabular-nums text-emerald-300">{u.topupSeconds ? `${secondsToHours(u.topupSeconds)} ${h}` : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card
              title={t('reports.byPc')}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    downloadCsv(`by_pc_${data.from}_${data.to}.csv`, [
                      ['pc_number', 'name', 'sessions', 'usage_hours', 'unique_users'],
                      ...data.byPc.map((p) => [p.number, p.name, p.sessions, secondsToHours(p.usageSeconds), p.uniqueUsers]),
                    ])
                  }
                >
                  ⬇ {t('common.exportCsv')}
                </Button>
              }
            >
              <Table minWidth={420}>
                <thead>
                  <tr>
                    <Th>{t('common.pc')}</Th>
                    <Th className="text-right">{t('reports.sessions')}</Th>
                    <Th>{t('reports.usage')}</Th>
                    <Th className="text-right">{t('reports.uniqueUsers')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPc.map((p) => (
                    <tr key={p.pcId}>
                      <Td className="whitespace-nowrap text-zinc-300">{p.name}</Td>
                      <Td className="text-right tabular-nums">{p.sessions}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Bar value={p.usageSeconds} max={maxPcUsage} className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-emerald-400" />
                          <span className="w-20 shrink-0 text-right text-xs tabular-nums">{formatDuration(p.usageSeconds, lang)}</span>
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums">{p.uniqueUsers}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>

          <SessionsCard
            path={withQuery('/reports/sessions', range)}
            title={t('reports.sessionsList')}
            showUser
            pageSize={20}
            actions={
              <Button size="sm" variant="secondary" loading={exporting} onClick={() => void exportSessions()}>
                ⬇ {t('common.exportCsv')}
              </Button>
            }
          />
          <p className="text-xs text-zinc-600">
            {data.from} → {data.to} · {formatDateTime(new Date().toISOString(), lang)}
          </p>
        </div>
      )}
    </>
  );
}
