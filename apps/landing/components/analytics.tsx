'use client';

import { useEffect, useState } from 'react';
import type { Content } from '@/lib/content';
import { GA_ID } from '@/lib/site';

const STORAGE_KEY = 'grm_site_consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadAnalytics() {
  if (!GA_ID || window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the raw `arguments` object from the data layer.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/** No-op until the visitor has allowed analytics. Never send names or phone numbers here. */
export function trackEvent(name: string, params: Record<string, string | number> = {}) {
  window.gtag?.('event', name, params);
}

/** Google Analytics loads only after an explicit "Allow". Nothing renders when no GA id is set. */
export function ConsentBanner({ text }: { text: Content['consent'] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* storage unavailable: ask each visit */
    }
    if (stored === 'granted') loadAnalytics();
    else if (stored !== 'denied') setOpen(true);
  }, []);

  const answer = (value: 'granted' | 'denied') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable */
    }
    if (value === 'granted') loadAnalytics();
    setOpen(false);
  };

  if (!open) return null;
  return (
    <aside className="consent" aria-label="Cookies">
      <p>{text.body}</p>
      <div>
        <button type="button" onClick={() => answer('denied')}>
          {text.decline}
        </button>
        <button type="button" onClick={() => answer('granted')}>
          {text.accept}
        </button>
      </div>
    </aside>
  );
}

/** Reports call and email clicks anywhere on the page, without their values. */
export function ContactTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="tel:"], a[href^="mailto:"]') as HTMLAnchorElement | null;
      if (link) trackEvent('contact_click', { method: link.href.startsWith('tel:') ? 'phone' : 'email' });
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
