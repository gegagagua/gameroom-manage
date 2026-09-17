'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { useRequireRole } from '@/components/auth-gate';
import { Loading } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function MeLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { me, ready } = useRequireRole('user');
  if (!ready || me?.role !== 'user') return <Loading />;
  return (
    <AppShell userName={me.user.name} nav={[{ href: '/me', label: t('nav.profile'), exact: true }]}>
      {children}
    </AppShell>
  );
}
