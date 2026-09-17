'use client';

import { LANGS } from '@grm/shared';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { clearCache } from '@/lib/swr';

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
  exact?: boolean;
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 p-0.5 text-xs">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={cn('rounded-md px-2 py-1 font-medium uppercase', lang === l ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white')}
        >
          {l === 'ka' ? 'ქარ' : 'EN'}
        </button>
      ))}
    </div>
  );
}

function NotificationToggle() {
  const { t } = useI18n();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    setPermission('Notification' in window ? Notification.permission : 'unsupported');
  }, []);

  if (permission !== 'default') return null;
  return (
    <button
      onClick={async () => setPermission(await Notification.requestPermission())}
      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
    >
      {t('nav.enableNotifications')}
    </button>
  );
}

export function AppShell({
  nav,
  userName,
  showNotifications,
  children,
}: {
  nav: NavItem[];
  userName: string;
  showNotifications?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    await clearCache();
    router.replace('/login');
  };

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href={nav[0]?.href ?? '/'} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-black text-white">
              GR
            </span>
            <span className="font-bold tracking-tight text-white">{t('app.name')}</span>
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition',
                  isActive(item) ? 'bg-violet-600/20 text-violet-200' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white',
                )}
              >
                {item.label}
                {!!item.badge && (
                  <span className="min-w-5 rounded-full bg-red-600 px-1.5 text-center text-xs font-bold text-white">{item.badge}</span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {showNotifications && <NotificationToggle />}
            <LangSwitch />
            <span className="hidden text-sm text-zinc-400 sm:inline">{userName}</span>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
