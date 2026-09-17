'use client';

import type { ReactNode } from 'react';
import { AlertPoller, useOpenAlerts } from '@/components/alert-poller';
import { AppShell } from '@/components/app-shell';
import { useRequireRole } from '@/components/auth-gate';
import { DesktopDownloadButton } from '@/components/desktop-download';
import { Loading } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  const { t } = useI18n();
  const { data: alerts } = useOpenAlerts();
  return (
    <AppShell
      userName={name}
      showNotifications
      headerExtra={<DesktopDownloadButton />}
      nav={[
        { href: '/admin', label: t('nav.dashboard'), exact: true },
        { href: '/admin/users', label: t('nav.users') },
        { href: '/admin/pcs', label: t('nav.pcs') },
        { href: '/admin/games', label: t('nav.games') },
        { href: '/admin/reports', label: t('nav.reports') },
        { href: '/admin/alerts', label: t('nav.alerts'), badge: alerts?.openCount },
      ]}
    >
      <AlertPoller />
      {children}
    </AppShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { me, ready } = useRequireRole('admin');
  if (!ready || me?.role !== 'admin') return <Loading />;
  return <AdminShell name={me.admin.name}>{children}</AdminShell>;
}
