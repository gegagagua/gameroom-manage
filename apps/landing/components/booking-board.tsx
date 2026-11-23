'use client';

import {
  BOOKING_DAY_MINUTES,
  BOOKING_DEVICES,
  BOOKING_STEP_MINUTES,
  bookingClock,
  bookingDeviceLabel,
  type PublicAvailability,
} from '@grm/shared';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { BoardText } from '@/lib/content';
import { BASE_PATH, CONTACT_PHONE, CONTACT_PHONE_LABEL, type Locale } from '@/lib/site';
import { trackEvent } from './analytics';

const DURATIONS = [60, 120, 180, 240, 360];
const DAYS_SHOWN = 7;
const KA_WEEKDAYS = ['კვი', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

function shiftDate(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayLabel(ymd: string, locale: Locale) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  if (locale === 'ka') return KA_WEEKDAYS[d.getUTCDay()];
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d);
}

/** Until 02:00 Tbilisi time the open business day is still yesterday's. */
function fallbackBusinessDate() {
  const tbilisi = new Date(Date.now() + 4 * 3600_000 - 2 * 3600_000);
  return tbilisi.toISOString().slice(0, 10);
}

const firstBookableStart = (date: string, now: PublicAvailability['now'] | null) => {
  if (!now || date !== now.date) return 0;
  return Math.max(0, Math.ceil(now.minute / BOOKING_STEP_MINUTES) * BOOKING_STEP_MINUTES);
};

type Status = 'loading' | 'ready' | 'failed';

export function BookingBoard({ text: t, locale }: { text: BoardText; locale: Locale }) {
  const [today, setToday] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState(240);
  const [length, setLength] = useState(120);
  const [picked, setPicked] = useState<string[]>([]);
  const [data, setData] = useState<PublicAvailability | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async (day: string) => {
    setStatus('loading');
    try {
      const res = await fetch(`${BASE_PATH}/api/public/bookings/availability?date=${day}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as PublicAvailability;
      setData(body);
      setToday(body.now.date);
      setStatus('ready');
      return body;
    } catch {
      setStatus('failed');
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const first = await load(fallbackBusinessDate());
      if (!active) return;
      const day = first?.now.date ?? fallbackBusinessDate();
      setDate(day);
      if (first && first.date !== day) await load(day);
      if (first) {
        const earliest = firstBookableStart(day, first.now);
        setStart((s) => Math.min(Math.max(s, earliest), BOOKING_DAY_MINUTES - BOOKING_STEP_MINUTES));
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const days = useMemo(() => {
    const base = today ?? fallbackBusinessDate();
    return Array.from({ length: DAYS_SHOWN }, (_, i) => shiftDate(base, i));
  }, [today]);

  const earliest = firstBookableStart(date ?? '', data?.now ?? null);
  const startOptions = useMemo(() => {
    const options: number[] = [];
    for (let m = earliest; m < BOOKING_DAY_MINUTES; m += BOOKING_STEP_MINUTES) options.push(m);
    return options;
  }, [earliest]);
  const dayClosed = startOptions.length === 0;
  const effectiveStart = startOptions.includes(start) ? start : (startOptions[0] ?? 0);
  const end = Math.min(effectiveStart + length, BOOKING_DAY_MINUTES);
  const timeLabel = `${bookingClock(effectiveStart)}–${bookingClock(end)}`;

  const busyUntil = useMemo(() => {
    const map = new Map<string, number>();
    if (!data || data.date !== date) return map;
    for (const b of data.busy) {
      if (b.startMinute < end && b.endMinute > effectiveStart) map.set(b.device, Math.max(map.get(b.device) ?? 0, b.endMinute));
    }
    return map;
  }, [data, date, effectiveStart, end]);

  const selected = picked.filter((d) => !busyUntil.has(d));

  const chooseDay = (day: string) => {
    setDate(day);
    setError(null);
    void load(day);
  };

  const toggle = (device: string) => {
    setError(null);
    setPicked((list) => (list.includes(device) ? list.filter((d) => d !== device) : [...list, device]));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return;
    if (!selected.length) return setError(t.pickStation);
    if (!name.trim()) return setError(t.needName);
    if (!/^\+?[\d\s()-]{6,24}$/.test(phone.trim())) return setError(t.needPhone);
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/public/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          startMinute: effectiveStart,
          endMinute: end,
          devices: selected,
          customerName: name.trim(),
          phone: phone.trim(),
          ...(website ? { website } : {}),
        }),
      });
      if (res.ok) {
        trackEvent('booking_request', { stations: selected.length, minutes: end - effectiveStart });
        setDone(t.doneBody.replace('{stations}', selected.map(bookingDeviceLabel).join(', ')).replace('{time}', timeLabel));
        setPicked([]);
        void load(date);
        return;
      }
      const body = (await res.json().catch(() => null)) as { code?: string } | null;
      if (res.status === 429) setError(t.errRate);
      else if (body?.code === 'BOOKING_CONFLICT') {
        setError(t.errConflict);
        void load(date);
      } else if (body?.code === 'BOOKING_IN_PAST') {
        setError(t.errPast);
        void load(date);
      } else if (body?.code === 'BOOKING_TOO_MANY') setError(t.errTooMany);
      else setError(t.errGeneric);
    } catch {
      setError(t.errGeneric);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setDone(null);
    setName('');
    setPhone('');
    setError(null);
  };

  return (
    <section id="book" className="board" aria-labelledby="board-title">
      <div className="board-controls">
        <h2 id="board-title">{t.title}</h2>
        <fieldset className="board-days">
          <legend className="sr-only">{t.day}</legend>
          {days.map((day, i) => (
            <button key={day} type="button" aria-pressed={day === date} onClick={() => chooseDay(day)}>
              <span>{i === 0 ? t.today : dayLabel(day, locale)}</span>
              <strong>{Number(day.slice(8))}</strong>
            </button>
          ))}
        </fieldset>
        <div className="board-time">
          <label>
            <span>{t.from}</span>
            <select value={effectiveStart} disabled={dayClosed} onChange={(e) => setStart(Number(e.target.value))}>
              {startOptions.map((m) => (
                <option key={m} value={m}>
                  {bookingClock(m)}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{t.length}</legend>
            <div>
              {DURATIONS.map((d) => (
                <button key={d} type="button" aria-pressed={d === length} onClick={() => setLength(d)}>
                  {d / 60}
                  <small>{t.hoursShort}</small>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="board-grid-wrap">
        <div className="board-grid-head">
          <h3>{t.stations}</h3>
          <output aria-live="polite">{timeLabel}</output>
        </div>
        {status === 'failed' ? (
          <div className="board-message" role="alert">
            <p>{t.loadFailed}</p>
            <button type="button" onClick={() => void load(date ?? fallbackBusinessDate())}>
              {t.retry}
            </button>
            <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_LABEL}</a>
          </div>
        ) : dayClosed ? (
          <p className="board-message">{t.closed}</p>
        ) : (
          <ul className="board-grid" aria-busy={status === 'loading'}>
            {BOOKING_DEVICES.map((device) => {
              const until = busyUntil.get(device);
              const isBusy = until !== undefined;
              const isPicked = selected.includes(device);
              const state = status === 'loading' ? '…' : isBusy ? t.taken : isPicked ? t.selected : t.free;
              return (
                <li key={device}>
                  <button
                    type="button"
                    className="flap"
                    data-state={isBusy ? 'busy' : isPicked ? 'picked' : 'free'}
                    disabled={isBusy || status === 'loading'}
                    aria-pressed={isPicked}
                    onClick={() => toggle(device)}
                  >
                    <span className="flap-name">{bookingDeviceLabel(device)}</span>
                    <span className="flap-state" key={state}>
                      {state}
                    </span>
                    <span className="flap-until">{isBusy ? t.until.replace('{time}', bookingClock(until)) : ' '}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {done ? (
        <div className="board-form board-done" role="status">
          <h3>{t.doneTitle}</h3>
          <p>{done}</p>
          <button type="button" className="btn-primary" onClick={reset}>
            {t.another}
          </button>
        </div>
      ) : (
        <form className="board-form" onSubmit={submit} noValidate>
          <label>
            <span>{t.name}</span>
            <input value={name} maxLength={100} autoComplete="name" required onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>{t.phone}</span>
            <input
              value={phone}
              type="tel"
              inputMode="tel"
              maxLength={24}
              autoComplete="tel"
              placeholder="+995 5__ __ __ __"
              required
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="hp" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary" disabled={sending || dayClosed}>
            {sending ? t.sending : t.submit}
          </button>
          {error && (
            <p className="board-error" role="alert">
              {error}
            </p>
          )}
          <p className="board-privacy">{t.privacy}</p>
        </form>
      )}
    </section>
  );
}
