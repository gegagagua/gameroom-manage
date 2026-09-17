/** Balance is stored in seconds; UI shows hours. */
export const hoursToSeconds = (hours: number) => Math.round(hours * 3600);
export const secondsToHours = (seconds: number) => Math.round((seconds / 3600) * 100) / 100;

/** 5400 → "01:30:00" (hours may exceed 24). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** 5400 → "1 სთ 30 წთ" / "1h 30m". Negative values keep the sign. */
export function formatDuration(totalSeconds: number, lang: 'ka' | 'en' = 'ka'): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const s = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const units = lang === 'ka' ? { h: ' სთ', m: ' წთ', s: ' წმ' } : { h: 'h', m: 'm', s: 's' };
  if (h === 0 && m === 0) return `${sign}${s}${units.s}`;
  if (h === 0) return `${sign}${m}${units.m}`;
  return `${sign}${h}${units.h}${m ? ` ${m}${units.m}` : ''}`;
}

/** 5400 → "1.5" */
export const formatHours = (seconds: number) => secondsToHours(seconds).toString();

/** Price list: 1 hour = 10 GEL — only used to show what a time balance is worth. */
export const GEL_PER_HOUR = 10;
export const secondsToGel = (seconds: number) => Math.round((seconds / 3600) * GEL_PER_HOUR * 100) / 100;

/** 3028 → "8.41 ₾" */
export const formatGel = (seconds: number) => `${secondsToGel(seconds).toFixed(2)} ₾`;
