import { secondsToHours, type Lang } from '@grm/shared';

const locale = (lang: Lang) => (lang === 'ka' ? 'ka-GE' : 'en-GB');

export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

export function formatDateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale(lang), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale(lang), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

const KA_WEEKDAYS = ['კვ', 'ორ', 'სმ', 'ოთ', 'პრ', 'პრ', 'შბ'];
const KA_MONTHS = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

/** "2026-09-14" → "ორ, 14 სექ" / "Mon 14 Sept". Georgian is explicit: browsers often lack ka Intl data. */
export function formatDateLabel(ymd: string, lang: Lang): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (lang === 'ka') return `${KA_WEEKDAYS[date.getDay()]}, ${d} ${KA_MONTHS[m - 1]}`;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', weekday: 'short' }).format(date);
}

export function relativeTime(iso: string | null | undefined, lang: Lang, now = Date.now()): string {
  if (!iso) return '—';
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const [value, unit] =
    abs < 60 ? [abs, 's'] : abs < 3600 ? [Math.round(abs / 60), 'm'] : abs < 86400 ? [Math.round(abs / 3600), 'h'] : [Math.round(abs / 86400), 'd'];
  if (lang === 'ka') {
    // Many browsers ship no Georgian data for Intl.RelativeTimeFormat, so format explicitly.
    const units: Record<string, string> = { s: 'წმ', m: 'წთ', h: 'სთ', d: 'დღ' };
    return diffSec <= 0 ? `${value} ${units[unit]} წინ` : `${value} ${units[unit]} შემდეგ`;
  }
  const names = { s: 'second', m: 'minute', h: 'hour', d: 'day' } as const;
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffSec < 0 ? -value : value, names[unit as keyof typeof names]);
}

/** Local calendar date as YYYY-MM-DD (for <input type="date">). */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 5400 → "1.5 სთ" */
export function hoursLabel(seconds: number, lang: Lang): string {
  return `${secondsToHours(seconds)} ${lang === 'ka' ? 'სთ' : 'h'}`;
}

/** Parses "1,5" or "1.5" → 1.5; NaN if invalid. */
export function parseHours(value: string): number {
  const v = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(v)) return Number.NaN;
  return Number(v);
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens Georgian text as UTF-8
  const csv = '﻿' + rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
