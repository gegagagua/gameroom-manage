'use client';

import { formatClock, formatDuration, secondsToHours, type UserDetailDto } from '@grm/shared';
import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { SessionsCard, TransactionsCard } from '@/components/history-tables';
import { useToast } from '@/components/toast';
import { Button, Card, FormError, Input, Loading, PageHeader, StatCard } from '@/components/ui';
import { api } from '@/lib/api';
import { cn, formatTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { REFRESH_MS } from '@/lib/swr';

function ChangePasswordCard() {
  const { t, errText } = useI18n();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 6) return setError(t('password.min'));
    if (next !== confirm) return setError(t('password.mismatch'));
    setBusy(true);
    setError(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      toast.success(t('me.passwordChanged'));
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('me.changePassword')}>
      <form onSubmit={submit} className="space-y-3">
        <Input label={t('me.currentPassword')} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <Input label={t('me.newPassword')} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} hint={t('password.min')} required />
        <Input label={t('me.confirmPassword')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <FormError message={error} />
        <Button type="submit" loading={busy} className="w-full">
          {t('me.changePassword')}
        </Button>
      </form>
    </Card>
  );
}

export default function MePage() {
  const { t, lang } = useI18n();
  const { data: me, isLoading } = useSWR<UserDetailDto>('/me', { refreshInterval: REFRESH_MS });

  if (isLoading || !me) return <Loading />;
  const empty = me.balanceSeconds <= 0;

  return (
    <>
      <PageHeader title={t('me.title')} subtitle={`${me.email} · ${me.phone}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section
            className={cn(
              'relative overflow-hidden rounded-3xl border p-6 sm:p-8',
              empty ? 'border-red-500/40 bg-red-950/30' : 'border-violet-500/40 bg-gradient-to-br from-violet-700/30 via-zinc-900 to-cyan-700/20',
            )}
          >
            <div className="text-sm uppercase tracking-widest text-zinc-300">{t('me.remaining')}</div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div className={cn('text-6xl font-black tabular-nums sm:text-7xl', empty ? 'text-red-400' : 'text-white')}>
                {secondsToHours(me.balanceSeconds)}
                <span className="ml-2 text-2xl font-semibold text-zinc-300">{t('me.hoursUnit')}</span>
              </div>
              <div className="pb-2 font-mono text-3xl tabular-nums text-cyan-200">{formatClock(me.balanceSeconds)}</div>
            </div>
            <div className="mt-2 text-zinc-300">{formatDuration(me.balanceSeconds, lang)}</div>
            {empty && <div className="mt-4 text-sm text-red-300">{t('me.noBalance')}</div>}
            {me.activeSession && (
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-xl border border-violet-400/30 bg-black/30 px-4 py-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <span className="font-semibold text-white">{t('me.playingOn', { pc: me.activeSession.pc.name })}</span>
                <span className="text-zinc-400">
                  {t('dash.since')} {formatTime(me.activeSession.startedAt, lang)} · {t('sessions.duration')}{' '}
                  {formatDuration(me.activeSession.consumedSeconds, lang)}
                </span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label={t('user.stats.sessions')} value={me.stats.sessionsCount} />
            <StatCard label={t('user.stats.consumed')} value={formatDuration(me.stats.consumedSeconds, lang)} tone="violet" />
            <StatCard label={t('user.stats.toppedUp')} value={formatDuration(me.stats.toppedUpSeconds, lang)} tone="green" />
          </div>

          <TransactionsCard path="/me/transactions" refreshInterval={REFRESH_MS} />
          <SessionsCard path="/me/sessions" refreshInterval={REFRESH_MS} />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ChangePasswordCard />
        </div>
      </div>
    </>
  );
}
