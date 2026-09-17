'use client';

import { alertTypeLabels, type AlertsResponse } from '@grm/shared';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { useAlertText } from '@/components/alert-poller';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Empty, Loading, PageHeader, Pagination, Segmented, Table, Td, Th } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { REFRESH_MS, revalidate } from '@/lib/swr';

const PAGE_SIZE = 25;

export default function AlertsPage() {
  const { t, lang, errText } = useI18n();
  const toast = useToast();
  const alertText = useAlertText();
  const [status, setStatus] = useState<'open' | 'all'>('open');
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | 'all' | null>(null);
  const { data, isLoading } = useSWR<AlertsResponse>(withQuery('/alerts', { status, page, pageSize: PAGE_SIZE }), {
    refreshInterval: REFRESH_MS,
  });

  const run = async (id: number | 'all', fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      await revalidate('/alerts');
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title={t('alerts.title')}
        actions={
          <>
            <Segmented
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { value: 'open', label: `${t('alerts.open')}${data?.openCount ? ` (${data.openCount})` : ''}` },
                { value: 'all', label: t('common.all') },
              ]}
            />
            <Button
              variant="secondary"
              disabled={!data?.openCount}
              loading={busyId === 'all'}
              onClick={() => void run('all', () => api('/alerts/ack-all', { method: 'POST' }))}
            >
              {t('alerts.ackAll')}
            </Button>
          </>
        }
      />
      <Card>
        {isLoading || !data ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <Empty>{status === 'open' ? t('alerts.none') : undefined}</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t('common.date')}</Th>
                <Th>{t('tx.type')}</Th>
                <Th>{t('common.user')}</Th>
                <Th>{t('common.pc')}</Th>
                <Th>{t('common.status')}</Th>
                <Th className="text-right">{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className={a.acknowledgedAt ? 'opacity-60' : a.type === 'BALANCE_DEPLETED' ? 'bg-red-500/5' : 'bg-amber-500/5'}>
                  <Td className="whitespace-nowrap tabular-nums text-zinc-300">{formatDateTime(a.createdAt, lang)}</Td>
                  <Td>
                    <Badge tone={a.type === 'BALANCE_DEPLETED' ? 'red' : 'amber'}>{alertTypeLabels[lang][a.type]}</Badge>
                    <div className="mt-1 text-xs text-zinc-400">{alertText(a)}</div>
                  </Td>
                  <Td>
                    <Link href={`/admin/users/${a.user.id}`} className="text-white hover:text-violet-200">
                      {a.user.name}
                    </Link>
                    <div className="text-xs tabular-nums text-zinc-500">{a.user.phone ?? ''}</div>
                  </Td>
                  <Td className="text-zinc-300">{a.pc?.name ?? '—'}</Td>
                  <Td className="text-xs text-zinc-400">
                    {a.acknowledgedAt ? (
                      <>
                        {t('alerts.acknowledged')}
                        <br />
                        {a.acknowledgedBy?.name} · {formatDateTime(a.acknowledgedAt, lang)}
                      </>
                    ) : (
                      <Badge tone="red">{t('alerts.open')}</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    {!a.acknowledgedAt && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === a.id}
                        onClick={() => void run(a.id, () => api(`/alerts/${a.id}/ack`, { method: 'POST' }))}
                      >
                        {t('alerts.ack')}
                      </Button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
