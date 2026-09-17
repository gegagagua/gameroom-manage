'use client';

import { DesktopDownloadCard } from '@/components/desktop-download';
import { PcRoom } from '@/components/pc-room';
import { PageHeader } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function PcsPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t('pcs.title')} subtitle={t('room.manageSubtitle')} />
      <DesktopDownloadCard />
      <PcRoom allowTableView />
    </>
  );
}
