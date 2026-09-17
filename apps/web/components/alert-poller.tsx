'use client';

import { alertTypeLabels, type AlertDto, type AlertsResponse } from '@grm/shared';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useI18n } from '@/lib/i18n';
import { REFRESH_MS } from '@/lib/swr';
import { useToast } from './toast';

export const OPEN_ALERTS_KEY = '/alerts?status=open&pageSize=50';

export function useOpenAlerts() {
  return useSWR<AlertsResponse>(OPEN_ALERTS_KEY, { refreshInterval: REFRESH_MS });
}

/** Short beep via WebAudio (no asset). Urgent = three high beeps. */
function beep(urgent: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const offsets = urgent ? [0, 0.28, 0.56] : [0];
    for (const offset of offsets) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + offset;
      osc.type = 'square';
      osc.frequency.value = urgent ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    /* audio blocked */
  }
}

export function useAlertText() {
  const { t } = useI18n();
  return (a: AlertDto) =>
    t(a.type === 'BALANCE_DEPLETED' ? 'alerts.depletedMsg' : 'alerts.lowMsg', {
      user: a.user.name,
      pc: a.pc?.name ?? '—',
    });
}

/**
 * Polls open alerts every 30 s (no sockets). Alerts that already existed on first load are only counted;
 * newer ones (id > last seen) raise a toast, a beep and a browser notification.
 */
export function AlertPoller() {
  const { data } = useOpenAlerts();
  const { lang } = useI18n();
  const toast = useToast();
  const alertText = useAlertText();
  const lastSeenId = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    const maxId = data.items.reduce((m, a) => Math.max(m, a.id), 0);
    if (lastSeenId.current === null) {
      lastSeenId.current = maxId;
      return;
    }
    const since = lastSeenId.current;
    const fresh = data.items.filter((a) => a.id > since).sort((a, b) => a.id - b.id);
    lastSeenId.current = Math.max(since, maxId);
    if (!fresh.length) return;

    for (const a of fresh) {
      const depleted = a.type === 'BALANCE_DEPLETED';
      const title = alertTypeLabels[lang][a.type];
      const body = alertText(a);
      toast.push({ kind: depleted ? 'error' : 'warning', title, body, duration: depleted ? 0 : 15000 });
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, { body, tag: `grm-alert-${a.id}` });
        } catch {
          /* notifications unavailable */
        }
      }
    }
    beep(fresh.some((a) => a.type === 'BALANCE_DEPLETED'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
