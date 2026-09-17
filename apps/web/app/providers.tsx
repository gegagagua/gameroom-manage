'use client';

import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { ToastProvider } from '@/components/toast';
import { ApiRequestError, swrFetcher } from '@/lib/api';
import { I18nProvider } from '@/lib/i18n';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        // Don't hammer the API on client errors (401/403/404/validation).
        onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
          if (err instanceof ApiRequestError && err.status >= 400 && err.status < 500) return;
          if (retryCount >= 3) return;
          setTimeout(() => revalidate({ retryCount }), 5000);
        },
      }}
    >
      <I18nProvider>
        <ToastProvider>{children}</ToastProvider>
      </I18nProvider>
    </SWRConfig>
  );
}
