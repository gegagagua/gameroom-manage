'use client';

import { PcRoom } from '@/components/pc-room';
import { PageHeader } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function DashboardPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t('dash.title')} subtitle={t('room.subtitle')} />
      <PcRoom showSummary />
    </>
  );
}
