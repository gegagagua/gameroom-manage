'use client';

import {
  BOOKING_DAY_MINUTES,
  BOOKING_DEVICES,
  BOOKING_SLOTS,
  BOOKING_STEP_MINUTES,
  bookingClock,
  type BookingDto,
  type BookingsDayResponse,
} from '@grm/shared';
import { useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { BookingModal, type BookingDraft } from '@/components/booking-modal';
import { BookingTimeline } from '@/components/booking-timeline';
import { Button, FormError, Loading, PageHeader } from '@/components/ui';
import { withQuery } from '@/lib/api';
import { formatDateLabel, toYmd } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { REFRESH_MS } from '@/lib/swr';

/** Until 02:00 the open business day is still yesterday's. */
const localBusinessDate = () => toYmd(new Date(Date.now() - 2 * 3600_000));

function shiftDate(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  return toYmd(new Date(y, m - 1, d + days));
}

function Stat({ label, value, tone = 'text-white' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-5 rounded border ${className}`} />
      {label}
    </span>
  );
}

export default function BookingsPage() {
  const { t, lang, errText } = useI18n();
  const [date, setDate] = useState(localBusinessDate);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const { data, error } = useSWR<BookingsDayResponse>(withQuery('/bookings', { date }), {
    refreshInterval: REFRESH_MS,
    keepPreviousData: true,
  });

  const { data: pending } = useSWR<{ items: BookingDto[] }>('/bookings/pending', { refreshInterval: REFRESH_MS });
  const openBooking = (booking: BookingDto) =>
    setDraft({
      booking,
      date: booking.date,
      startMinute: booking.startMinute,
      endMinute: booking.endMinute,
      devices: booking.devices,
    });

  const shown = data?.date === date ? data : undefined;
  const items = shown?.items ?? [];
  const today = data?.now.date ?? localBusinessDate();
  const isToday = date === today;
  const effectiveNow = date < today ? BOOKING_DAY_MINUTES + 1 : date > today ? -1 : (data?.now.minute ?? -1);
  const showNowLine = isToday && effectiveNow >= 0 && effectiveNow <= BOOKING_DAY_MINUTES;

  const total = BOOKING_DEVICES.length;
  const busyNow = showNowLine
    ? items.filter((b) => b.startMinute <= effectiveNow && b.endMinute > effectiveNow).reduce((n, b) => n + b.devices.length, 0)
    : 0;
  let peak = { busy: 0, minute: 0 };
  for (let i = 0; i < BOOKING_SLOTS; i++) {
    const minute = i * BOOKING_STEP_MINUTES;
    const busy = items.filter((b) => b.startMinute <= minute && b.endMinute > minute).reduce((n, b) => n + b.devices.length, 0);
    if (busy > peak.busy) peak = { busy, minute };
  }

  const newDraft = (device: string[], startMinute: number, endMinute: number) =>
    setDraft({ date, startMinute, endMinute, devices: device });
  const firstFreeStart = Math.ceil(Math.max(effectiveNow, 0) / BOOKING_STEP_MINUTES) * BOOKING_STEP_MINUTES;
  const canAdd = firstFreeStart < BOOKING_DAY_MINUTES;

  return (
    <div>
      <PageHeader
        title={t('bookings.title')}
        subtitle={t('bookings.subtitle')}
        actions={
          <>
            <Button variant="secondary" aria-label={t('bookings.prevDay')} title={t('bookings.prevDay')} onClick={() => setDate(shiftDate(date, -1))}>
              ←
            </Button>
            <input
              type="date"
              aria-label={t('bookings.date')}
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500"
            />
            <Button variant="secondary" aria-label={t('bookings.nextDay')} title={t('bookings.nextDay')} onClick={() => setDate(shiftDate(date, 1))}>
              →
            </Button>
            <Button variant={isToday ? 'ghost' : 'secondary'} disabled={isToday} onClick={() => setDate(today)}>
              {t('bookings.today')}
            </Button>
            <Button
              disabled={!canAdd}
              onClick={() => newDraft([], firstFreeStart, Math.min(firstFreeStart + 60, BOOKING_DAY_MINUTES))}
            >
              + {t('bookings.new')}
            </Button>
          </>
        }
      />

      {!!pending?.items.length && (
        <section className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2">
          <h2 className="mr-1 text-sm font-semibold text-amber-200">{t('bookings.pendingTitle', { n: pending.items.length })}</h2>
          {pending.items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setDate(b.date);
                openBooking(b);
              }}
              className="rounded-lg border border-amber-300/50 bg-zinc-950/50 px-2.5 py-1 text-xs tabular-nums text-amber-100 hover:bg-amber-400/20"
            >
              {formatDateLabel(b.date, lang)} · {bookingClock(b.startMinute)}–{bookingClock(b.endMinute)} · {b.customerName} · ×{b.devices.length}
            </button>
          ))}
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-2 text-lg font-bold text-white">{formatDateLabel(date, lang)}</span>
        {showNowLine && (
          <>
            <Stat label={t('bookings.busyNow')} value={`${busyNow} / ${total}`} tone="text-emerald-300" />
            <Stat label={t('bookings.freeNow')} value={total - busyNow} />
          </>
        )}
        <Stat label={t('bookings.count')} value={items.length} />
        <Stat
          label={t('bookings.peak')}
          value={peak.busy ? `${peak.busy} / ${total} · ${bookingClock(peak.minute)}` : '—'}
          tone="text-amber-300"
        />
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <Legend className="border-emerald-300 bg-emerald-500" label={t('bookings.legendNow')} />
          <Legend className="border-violet-400 bg-violet-600" label={t('bookings.legendUpcoming')} />
          <Legend className="border-zinc-600 bg-zinc-700" label={t('bookings.legendPast')} />
          <Legend className="border-dashed border-amber-300 bg-amber-400" label={t('bookings.legendPending')} />
          <span>{t('bookings.legendGroup')}</span>
        </div>
      </div>

      {error && !data ? (
        <FormError message={errText(error)} />
      ) : !data ? (
        <Loading />
      ) : (
        <BookingTimeline
          items={items}
          effectiveNow={effectiveNow}
          showNowLine={showNowLine}
          onCreate={(device, start, end) => newDraft([device], start, end)}
          onOpen={openBooking}
        />
      )}

      {draft && <BookingModal key={draft.booking?.id ?? 'new'} draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}
