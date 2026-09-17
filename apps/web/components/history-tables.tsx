'use client';

import {
  endReasonLabels,
  formatDuration,
  transactionTypeLabels,
  type Paginated,
  type SessionDto,
  type TransactionDto,
} from '@grm/shared';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { withQuery } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { Badge, Card, Empty, Loading, Pagination, Table, Td, Th } from './ui';

const txTone = { TOPUP: 'green', DEDUCTION: 'amber', SESSION_CHARGE: 'cyan' } as const;

/** Balance ledger for `/users/:id/transactions` or `/me/transactions`. */
export function TransactionsCard({ path, refreshInterval, pageSize = 15 }: { path: string; refreshInterval?: number; pageSize?: number }) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR<Paginated<TransactionDto>>(withQuery(path, { page, pageSize }), { refreshInterval });

  return (
    <Card title={t('tx.title')}>
      {isLoading || !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('common.date')}</Th>
              <Th>{t('tx.type')}</Th>
              <Th className="text-right">{t('tx.amount')}</Th>
              <Th className="text-right">{t('tx.after')}</Th>
              <Th>{t('common.note')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((tx) => (
              <tr key={tx.id}>
                <Td className="whitespace-nowrap tabular-nums text-zinc-400">{formatDateTime(tx.createdAt, lang)}</Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge tone={txTone[tx.type]}>{transactionTypeLabels[lang][tx.type]}</Badge>
                    {tx.session?.status === 'ACTIVE' && <Badge tone="violet">{t('tx.inProgress')}</Badge>}
                  </div>
                </Td>
                <Td className={cn('whitespace-nowrap text-right font-semibold tabular-nums', tx.amountSeconds > 0 ? 'text-emerald-300' : tx.amountSeconds < 0 ? 'text-red-300' : 'text-zinc-400')}>
                  {tx.amountSeconds > 0 ? '+' : ''}
                  {formatDuration(tx.amountSeconds, lang)}
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-zinc-300">{formatDuration(tx.balanceAfterSeconds, lang)}</Td>
                <Td className="text-zinc-400">
                  {tx.session ? `🎮 ${tx.session.pc.name}` : tx.note || '—'}
                  {tx.session && tx.note && tx.note !== tx.session.pc.name ? ` · ${tx.note}` : ''}
                  {tx.admin && <span className="ml-1 text-xs text-zinc-500">({tx.admin.name})</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {data && <Pagination page={page} pageSize={pageSize} total={data.total} onChange={setPage} />}
    </Card>
  );
}

/** Sessions list for `/users/:id/sessions`, `/me/sessions` or `/reports/sessions?from&to`. */
export function SessionsCard({
  path,
  title,
  showUser,
  refreshInterval,
  pageSize = 15,
  actions,
}: {
  path: string;
  title?: string;
  showUser?: boolean;
  refreshInterval?: number;
  pageSize?: number;
  actions?: ReactNode;
}) {
  const { t, lang } = useI18n();
  const [page, setPage] = useState(1);
  const [prevPath, setPrevPath] = useState(path);
  if (prevPath !== path) {
    setPrevPath(path);
    setPage(1);
  }
  const { data, isLoading } = useSWR<Paginated<SessionDto>>(withQuery(path, { page, pageSize }), { refreshInterval });

  return (
    <Card title={title ?? t('sessions.title')} actions={actions}>
      {isLoading || !data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <Empty />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t('sessions.started')}</Th>
              <Th>{t('sessions.ended')}</Th>
              {showUser && <Th>{t('common.user')}</Th>}
              <Th>{t('common.pc')}</Th>
              <Th className="text-right">{t('sessions.duration')}</Th>
              <Th>{t('sessions.reason')}</Th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s.id}>
                <Td className="whitespace-nowrap tabular-nums text-zinc-300">{formatDateTime(s.startedAt, lang)}</Td>
                <Td className="whitespace-nowrap tabular-nums text-zinc-400">{s.endedAt ? formatDateTime(s.endedAt, lang) : '—'}</Td>
                {showUser && (
                  <Td>
                    {s.user ? (
                      <Link href={`/admin/users/${s.user.id}`} className="text-white hover:text-violet-200">
                        {s.user.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </Td>
                )}
                <Td className="text-zinc-300">{s.pc?.name ?? '—'}</Td>
                <Td className="whitespace-nowrap text-right font-semibold tabular-nums text-white">{formatDuration(s.consumedSeconds, lang)}</Td>
                <Td>
                  {s.status === 'ACTIVE' ? (
                    <Badge tone="violet">{t('sessions.active')}</Badge>
                  ) : s.endReason ? (
                    <Badge tone={s.endReason === 'BALANCE_DEPLETED' ? 'red' : s.endReason === 'LOGOUT' ? 'gray' : 'amber'}>
                      {endReasonLabels[lang][s.endReason]}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {data && <Pagination page={page} pageSize={pageSize} total={data.total} onChange={setPage} />}
    </Card>
  );
}
