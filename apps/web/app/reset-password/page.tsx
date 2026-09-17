'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Button, FormError, Input, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

function ResetPasswordForm() {
  const { t, errText } = useI18n();
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return setError(t('password.min'));
    if (password !== confirm) return setError(t('password.mismatch'));
    setBusy(true);
    setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t('reset.title')}>
      {!token ? (
        <FormError message={t('reset.missingToken')} />
      ) : done ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{t('reset.done')}</div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input
            label={t('reset.newPassword')}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={t('password.min')}
            required
            autoFocus
          />
          <Input
            label={t('reset.confirmPassword')}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <FormError message={error} />
          <Button type="submit" loading={busy} className="w-full">
            {t('reset.submit')}
          </Button>
        </form>
      )}
      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-violet-300 hover:text-violet-200">
          {t('forgot.backToLogin')}
        </Link>
      </div>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
