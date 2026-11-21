'use client';

import { alertTypeLabels, type AlertDto, type AlertsResponse, type PcsResponse } from '@grm/shared';
import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { beep, flashTitle, markWarned, notifyBrowser, warningKey, wasWarned } from '@/lib/attention';
import { useI18n } from '@/lib/i18n';
import { REFRESH_MS } from '@/lib/swr';
import { useToast } from './toast';

export const OPEN_ALERTS_KEY = '/alerts?status=open&pageSize=50';

export function useOpenAlerts() {
  return useSWR<AlertsResponse>(OPEN_ALERTS_KEY, { refreshInterval: REFRESH_MS });
}

export function useAlertText() {
  const { t } = useI18n();
  return (a: AlertDto) =>
    a.type === 'LOW_BALANCE' && a.secondsLeft !== null
      ? t('alerts.lowMsgMin', { user: a.user.name, pc: a.pc?.name ?? '—', min: Math.max(1, Math.ceil(a.secondsLeft / 60)) })
      : t(a.type === 'BALANCE_DEPLETED' ? 'alerts.depletedMsg' : 'alerts.lowMsg', {
          user: a.user.name,
          pc: a.pc?.name ?? '—',
        });
}

/** Server alerts carry the balance at raise time → which warning stage they are. */
const stageOf = (a: AlertDto, lowSeconds: number) => ((a.secondsLeft ?? 0) > lowSeconds ? 'early' : 'low');

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
  const { data: room } = useSWR<PcsResponse>('/pcs', { refreshInterval: REFRESH_MS });
  const lowSeconds = room?.lowBalanceThresholdSeconds ?? 300;

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

    // A low-time warning the live countdown already announced is not announced twice.
    const announce = fresh.filter(
      (a) => !(a.type === 'LOW_BALANCE' && a.sessionId !== null && wasWarned(warningKey(a.sessionId, stageOf(a, lowSeconds)))),
    );
    if (!announce.length) return;
    for (const a of announce) {
      const depleted = a.type === 'BALANCE_DEPLETED';
      const title = alertTypeLabels[lang][a.type];
      const body = alertText(a);
      toast.push({ kind: depleted ? 'error' : 'warning', title, body, duration: depleted ? 0 : 20000 });
      notifyBrowser(title, body, `grm-alert-${a.id}`);
      flashTitle(`⚠ ${body}`);
    }
    beep(announce.some((a) => a.type === 'BALANCE_DEPLETED' || stageOf(a, lowSeconds) === 'low'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return <LowTimeWatcher room={room} />;
}

/**
 * Announces the 10-min and 5-min marks the second the live countdown crosses them (the server alert
 * only arrives with the next heartbeat/sweep + poll). Toast, beep, OS notification, blinking tab title —
 * on every admin page, so it reaches an admin who is in another tab.
 */
function LowTimeWatcher({ room }: { room: PcsResponse | undefined }) {
  const { t } = useI18n();
  const toast = useToast();
  const previous = useRef(new Map<number, number>());
  const roomRef = useRef(room);
  const sync = useRef<{ offsetMs: number } | null>(null);
  roomRef.current = room;

  useEffect(() => {
    if (room) sync.current = { offsetMs: Date.parse(room.serverTime) - Date.now() };
  }, [room]);

  useEffect(() => {
    const tick = () => {
      const r = roomRef.current;
      if (!r || !sync.current) return;
      const serverNow = Date.now() + sync.current.offsetMs;
      const seen = new Set<number>();
      for (const pc of r.items) {
        const s = pc.currentSession;
        if (!s) continue;
        seen.add(s.id);
        const remaining = s.paused
          ? s.user.balanceSeconds
          : Math.max(0, Math.floor(s.user.balanceSeconds - Math.max(0, (serverNow - Date.parse(s.billedUpTo)) / 1000)));
        const before = previous.current.get(s.id);
        previous.current.set(s.id, remaining);
        if (before === undefined) continue; // only announce crossings we actually watched
        const stage =
          before > r.lowBalanceThresholdSeconds && remaining <= r.lowBalanceThresholdSeconds
            ? 'low'
            : before > r.lowBalanceEarlySeconds && remaining <= r.lowBalanceEarlySeconds
              ? 'early'
              : null;
        if (!stage || remaining <= 0) continue;
        const key = warningKey(s.id, stage);
        if (wasWarned(key)) continue;
        markWarned(key);
        const title = t('alerts.timeRunningOut');
        const body = t('alerts.lowMsgMin', { user: s.user.name, pc: pc.name, min: Math.ceil(remaining / 60) });
        toast.push({ kind: 'warning', title, body, duration: 20000 });
        notifyBrowser(title, body, `grm-low-${key}`);
        flashTitle(`⚠ ${body}`);
        beep(stage === 'low');
      }
      for (const id of previous.current.keys()) if (!seen.has(id)) previous.current.delete(id);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
