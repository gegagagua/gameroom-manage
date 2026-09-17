'use client';

import { formatDuration, hoursToSeconds, type TransactionDto, type UserDto } from '@grm/shared';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn, parseHours } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useToast } from './toast';
import { Button, Card, FormError, Input, Segmented } from './ui';

type Operation = 'add' | 'subtract' | 'set';
const PRESETS = [0.5, 1, 2, 3, 5];

/** Admin-only balance management (add / subtract / set exact hours). */
export function BalancePanel({ user, onDone }: { user: UserDto; onDone: () => void }) {
  const { t, lang, errText } = useI18n();
  const toast = useToast();
  const [operation, setOperation] = useState<Operation>('add');
  const [hours, setHours] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseHours(hours);
  const seconds = Number.isNaN(parsed) ? Number.NaN : hoursToSeconds(parsed);
  const preview =
    Number.isNaN(seconds) ? null : operation === 'add' ? user.balanceSeconds + seconds : operation === 'subtract' ? user.balanceSeconds - seconds : seconds;
  const valid = preview !== null && preview >= 0 && (operation === 'set' || seconds > 0) && parsed <= 10000;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api<{ user: UserDto; transaction: TransactionDto | null }>(`/users/${user.id}/balance`, {
        method: 'POST',
        body: { operation, hours: parsed, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      toast.success(t('balance.done'));
      setNote('');
      onDone();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t('balance.title')}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-zinc-400">{t('balance.current')}</span>
          <span className="text-2xl font-bold tabular-nums text-white">{formatDuration(user.balanceSeconds, lang)}</span>
        </div>

        <Segmented<Operation>
          value={operation}
          onChange={setOperation}
          options={[
            { value: 'add', label: t('balance.add') },
            { value: 'subtract', label: t('balance.subtract') },
            { value: 'set', label: t('balance.set') },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setHours(String(p))}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm tabular-nums transition',
                parsed === p ? 'border-violet-500 bg-violet-600/20 text-violet-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800',
              )}
            >
              {p} {lang === 'ka' ? 'სთ' : 'h'}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('balance.hours')} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} required />
          <Input label={t('common.note')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('balance.notePlaceholder')} maxLength={500} />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
          <span className="text-zinc-400">{t('balance.preview')}</span>
          <span className={cn('font-bold tabular-nums', preview !== null && preview < 0 ? 'text-red-400' : 'text-emerald-300')}>
            {preview === null ? '—' : formatDuration(preview, lang)}
          </span>
        </div>

        <FormError message={error} />
        <Button
          type="submit"
          loading={busy}
          disabled={!valid}
          variant={operation === 'subtract' ? 'warning' : 'primary'}
          className="w-full"
        >
          {t('balance.apply')}
        </Button>
      </form>
    </Card>
  );
}
