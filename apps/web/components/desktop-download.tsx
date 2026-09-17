'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui';
import { DESKTOP_DOWNLOAD_URL, desktopApiUrl } from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';

export function DesktopDownloadButton() {
  const { t } = useI18n();
  return (
    <a
      href={DESKTOP_DOWNLOAD_URL}
      className="whitespace-nowrap rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 px-3 py-1 text-sm font-medium text-white hover:brightness-110"
    >
      {t('desktop.download')}
    </a>
  );
}

export function DesktopDownloadCard() {
  const { t } = useI18n();
  const [apiUrl, setApiUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setApiUrl(desktopApiUrl()), []);

  const copy = async () => {
    await navigator.clipboard?.writeText(apiUrl).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card title={t('desktop.title')} actions={<DesktopDownloadButton />} className="mb-6" bodyClassName="space-y-3">
      <p className="text-sm text-zinc-400">{t('desktop.hint')}</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">{t('desktop.apiUrl')}:</span>
        <code className="rounded-md bg-black/40 px-2 py-1 text-cyan-300">{apiUrl}</code>
        <button onClick={copy} className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
          {copied ? t('desktop.copied') : t('desktop.copy')}
        </button>
      </div>
    </Card>
  );
}
