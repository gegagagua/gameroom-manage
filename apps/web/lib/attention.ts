'use client';

/**
 * Ways to grab the admin's attention: beep, OS notification, flashing tab title.
 * Shared by the alert poller (server alerts) and the live low-time watcher (local countdown).
 */

/** Short beep via WebAudio (no asset). Urgent = three high beeps. */
export function beep(urgent: boolean) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const offsets = urgent ? [0, 0.28, 0.56] : [0, 0.32];
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

/** OS-level notification — visible even when another tab or app is in front (needs permission). */
export function notifyBrowser(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* notifications unavailable */
  }
}

let flashTimer: ReturnType<typeof setInterval> | null = null;
let baseTitle = '';

/** Blinks the tab title while the tab is in the background; stops when the admin comes back. */
export function flashTitle(message: string) {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (flashTimer) clearInterval(flashTimer);
  else baseTitle = document.title;
  let on = false;
  flashTimer = setInterval(() => {
    on = !on;
    document.title = on ? message : baseTitle;
  }, 1000);
  const stop = () => {
    if (document.hidden) return;
    if (flashTimer) clearInterval(flashTimer);
    flashTimer = null;
    document.title = baseTitle;
    document.removeEventListener('visibilitychange', stop);
  };
  document.addEventListener('visibilitychange', stop);
}

/** Warnings already raised locally (sessionId:stage) — the poller skips the matching server alert. */
const raised = new Set<string>();
export const warningKey = (sessionId: number, stage: 'early' | 'low') => `${sessionId}:${stage}`;
export const markWarned = (key: string) => raised.add(key);
export const wasWarned = (key: string) => raised.has(key);
