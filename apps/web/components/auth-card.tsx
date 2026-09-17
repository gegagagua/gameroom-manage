'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { LangSwitch } from './app-shell';

/** Centered card layout for login / password pages. */
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4">
        <LangSwitch />
      </div>
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-xl font-black text-white shadow-lg shadow-violet-900/40">
          GR
        </span>
        <div>
          <div className="text-2xl font-bold text-white">{t('app.name')}</div>
          <div className="text-sm text-zinc-400">{t('app.tagline')}</div>
        </div>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur">
        <h1 className="mb-5 text-lg font-semibold text-white">{title}</h1>
        {children}
      </div>
    </div>
  );
}
