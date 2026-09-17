'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard } from '@/components/auth-card';
import { Button, FormError, Input, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { clearCache } from '@/lib/swr';

type Tab = 'user' | 'admin';

export default function LoginPage() {
  const { t, errText } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('user');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (tab === 'admin') {
        await api('/auth/admin/login', { method: 'POST', body: { email: login.trim(), password } });
      } else {
        await api('/auth/login', { method: 'POST', body: { login: login.trim(), password } });
      }
      await clearCache();
      const home = tab === 'admin' ? '/admin' : '/me';
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith(home) ? next : home);
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t('login.title')}>
      <div className="mb-5 flex justify-center">
        <Segmented<Tab>
          value={tab}
          onChange={(v) => {
            setTab(v);
            setError(null);
          }}
          options={[
            { value: 'user', label: t('login.tabCustomer') },
            { value: 'admin', label: t('login.tabAdmin') },
          ]}
        />
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label={tab === 'admin' ? t('common.email') : t('login.login')}
          type={tab === 'admin' ? 'email' : 'text'}
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          autoFocus
        />
        <Input
          label={t('common.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FormError message={error} />
        <Button type="submit" loading={busy} className="w-full">
          {t('login.submit')}
        </Button>
        {tab === 'user' && (
          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-violet-300 hover:text-violet-200">
              {t('login.forgot')}
            </Link>
          </div>
        )}
      </form>
    </AuthCard>
  );
}
