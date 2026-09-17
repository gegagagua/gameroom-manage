'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Button, FormError, Input } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function ForgotPasswordPage() {
  const { t, errText } = useI18n();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email: email.trim() } });
      setSent(true);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t('forgot.title')}>
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {t('forgot.sent')}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-zinc-400">{t('forgot.hint')}</p>
          <Input label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <FormError message={error} />
          <Button type="submit" loading={busy} className="w-full">
            {t('forgot.submit')}
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
