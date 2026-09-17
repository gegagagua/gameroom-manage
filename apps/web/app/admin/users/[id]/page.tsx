'use client';

import { formatDuration, secondsToHours, type UserDetailDto } from '@grm/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { BalancePanel } from '@/components/balance-panel';
import { SessionsCard, TransactionsCard } from '@/components/history-tables';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, Empty, Loading, PageHeader, StatCard } from '@/components/ui';
import { UserFormModal } from '@/components/user-form-modal';
import { formatDateTime, formatTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { revalidate, REFRESH_MS } from '@/lib/swr';

export default function UserDetailPage() {
  const { t, lang, errText } = useI18n();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const { data: user, error, isLoading } = useSWR<UserDetailDto>(`/users/${id}`, { refreshInterval: REFRESH_MS });

  const refreshAll = () => revalidate(`/users/${id}`, '/users?');

  if (error) {
    return (
      <Card>
        <Empty>{errText(error)}</Empty>
      </Card>
    );
  }
  if (isLoading || !user) return <Loading />;

  return (
    <>
      <Link href="/admin/users" className="mb-3 inline-block text-sm text-zinc-400 hover:text-white">
        {t('common.back')}
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {user.name}
            <Badge tone={user.isActive ? 'green' : 'gray'}>{user.isActive ? t('common.active') : t('common.inactive')}</Badge>
            {user.activeSession && <Badge tone="violet">🎮 {user.activeSession.pc.name}</Badge>}
          </span>
        }
        subtitle={`${user.email} · ${user.phone} · ${t('user.createdAt')}: ${formatDateTime(user.createdAt, lang)}`}
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label={t('common.balance')}
              value={formatDuration(user.balanceSeconds, lang)}
              sub={`${secondsToHours(user.balanceSeconds)} ${lang === 'ka' ? 'სთ' : 'h'}`}
              tone={user.balanceSeconds > 0 ? 'green' : 'red'}
            />
            <StatCard label={t('user.stats.sessions')} value={user.stats.sessionsCount} />
            <StatCard label={t('user.stats.consumed')} value={formatDuration(user.stats.consumedSeconds, lang)} tone="violet" />
            <StatCard label={t('user.stats.toppedUp')} value={formatDuration(user.stats.toppedUpSeconds, lang)} />
          </div>

          <Card title={t('user.activeSession')}>
            {user.activeSession ? (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                <div>
                  <div className="text-xs text-zinc-500">{t('common.pc')}</div>
                  <div className="text-lg font-semibold text-white">{user.activeSession.pc.name}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">{t('dash.since')}</div>
                  <div className="text-lg tabular-nums text-white">{formatTime(user.activeSession.startedAt, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">{t('sessions.duration')}</div>
                  <div className="text-lg tabular-nums text-white">{formatDuration(user.activeSession.consumedSeconds, lang)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-500">{t('user.noActiveSession')}</div>
            )}
          </Card>

          <TransactionsCard path={`/users/${id}/transactions`} refreshInterval={REFRESH_MS} />
          <SessionsCard path={`/users/${id}/sessions`} refreshInterval={REFRESH_MS} />
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <BalancePanel user={user} onDone={refreshAll} />
        </div>
      </div>

      <UserFormModal
        open={editing}
        user={user}
        onClose={() => setEditing(false)}
        onSaved={() => {
          toast.success(t('users.updated'));
          void refreshAll();
        }}
      />
    </>
  );
}
