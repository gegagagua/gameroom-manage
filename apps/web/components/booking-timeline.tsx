'use client';

import {
  BOOKING_DAY_MINUTES,
  BOOKING_DEVICES,
  BOOKING_SLOTS,
  BOOKING_STEP_MINUTES,
  bookingClock,
  bookingDeviceLabel,
  type BookingDto,
} from '@grm/shared';
import { useState, type PointerEvent } from 'react';
import { cn } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

const LABEL_WIDTH = 84;
const MIDNIGHT = 600;
const pct = (minute: number) => `${(minute / BOOKING_DAY_MINUTES) * 100}%`;
const rowHeight = 'h-[clamp(34px,4.7vh,46px)]';

const gridLines = {
  backgroundImage:
    'linear-gradient(to right, rgb(113 113 122 / 0.38) 1px, transparent 1px), linear-gradient(to right, rgb(113 113 122 / 0.14) 1px, transparent 1px)',
  backgroundSize: `${100 / 12}% 100%, ${100 / 24}% 100%`,
};

type BarState = 'past' | 'now' | 'upcoming';
const barTones: Record<BarState, string> = {
  past: 'border-zinc-600 bg-zinc-700/70 text-zinc-300',
  now: 'border-emerald-300 bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/25',
  upcoming: 'border-violet-400 bg-violet-600 text-white',
};

export const barState = (b: BookingDto, now: number): BarState =>
  b.endMinute <= now ? 'past' : b.startMinute <= now ? 'now' : 'upcoming';

function occupancyTone(busy: number, total: number) {
  if (busy === 0) return 'bg-zinc-900 text-zinc-600';
  const ratio = busy / total;
  if (ratio >= 1) return 'bg-red-500 text-white font-bold';
  if (ratio >= 0.75) return 'bg-orange-500 text-zinc-950 font-semibold';
  if (ratio >= 0.4) return 'bg-amber-400/80 text-zinc-950 font-semibold';
  return 'bg-emerald-500/30 text-emerald-200';
}

function DeviceRow({
  device,
  bookings,
  effectiveNow,
  minMinute,
  hoveredId,
  onHover,
  onCreate,
  onOpen,
}: {
  device: string;
  bookings: BookingDto[];
  effectiveNow: number;
  minMinute: number;
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onCreate: (device: string, start: number, end: number) => void;
  onOpen: (booking: BookingDto) => void;
}) {
  const [drag, setDrag] = useState<{ anchor: number; head: number; lo: number; hi: number } | null>(null);
  const isSony = device.startsWith('SONY');

  const slotAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.min(BOOKING_SLOTS - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * BOOKING_SLOTS)));
  };

  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const slot = slotAt(e);
    const minute = slot * BOOKING_STEP_MINUTES;
    if (minute < minMinute || bookings.some((b) => b.startMinute <= minute && b.endMinute > minute)) return;
    let lo = minMinute / BOOKING_STEP_MINUTES;
    let hi = BOOKING_SLOTS;
    for (const b of bookings) {
      if (b.endMinute <= minute) lo = Math.max(lo, b.endMinute / BOOKING_STEP_MINUTES);
      if (b.startMinute > minute) hi = Math.min(hi, b.startMinute / BOOKING_STEP_MINUTES);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ anchor: slot, head: slot, lo, hi });
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const head = Math.min(drag.hi - 1, Math.max(drag.lo, slotAt(e)));
    if (head !== drag.head) setDrag({ ...drag, head });
  };

  const finish = () => {
    if (!drag) return;
    const from = Math.min(drag.anchor, drag.head) * BOOKING_STEP_MINUTES;
    const to = (Math.max(drag.anchor, drag.head) + 1) * BOOKING_STEP_MINUTES;
    // A plain click proposes one hour, cut short if the next booking starts sooner.
    const end = drag.anchor === drag.head ? Math.min(from + 60, drag.hi * BOOKING_STEP_MINUTES) : to;
    setDrag(null);
    onCreate(device, from, end);
  };

  const preview = drag && {
    from: Math.min(drag.anchor, drag.head) * BOOKING_STEP_MINUTES,
    to: (Math.max(drag.anchor, drag.head) + 1) * BOOKING_STEP_MINUTES,
  };

  return (
    <div className={cn('flex border-t', device === 'SONY-1' ? 'border-t-2 border-cyan-500/50' : 'border-zinc-800')}>
      <div
        style={{ width: LABEL_WIDTH }}
        className={cn(
          'sticky left-0 z-20 flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-zinc-700 bg-zinc-900 px-3 text-sm font-semibold tabular-nums',
          isSony ? 'text-cyan-300' : 'text-zinc-200',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', isSony ? 'bg-cyan-400' : 'bg-zinc-500')} />
        {bookingDeviceLabel(device)}
      </div>
      <div
        className={cn('relative flex-1 touch-pan-y select-none', rowHeight, minMinute < BOOKING_DAY_MINUTES && 'cursor-crosshair')}
        style={gridLines}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={() => setDrag(null)}
      >
        {bookings.map((b) => {
          const state = barState(b, effectiveNow);
          return (
            <button
              key={b.id}
              type="button"
              title={`${b.customerName} · ${bookingClock(b.startMinute)}–${bookingClock(b.endMinute)}${b.phone ? ` · ${b.phone}` : ''}${b.note ? `\n${b.note}` : ''}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onOpen(b)}
              onMouseEnter={() => onHover(b.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(b.id)}
              onBlur={() => onHover(null)}
              style={{ left: pct(b.startMinute), width: pct(b.endMinute - b.startMinute) }}
              className={cn(
                'absolute inset-y-[3px] z-10 flex items-center gap-1.5 overflow-hidden rounded-md border px-1.5 text-left leading-none transition',
                barTones[state],
                hoveredId === b.id && 'ring-2 ring-white',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">{b.customerName}</span>
                <span className="mt-0.5 block truncate text-[11px] tabular-nums opacity-90">
                  {bookingClock(b.startMinute)}–{bookingClock(b.endMinute)}
                </span>
              </span>
              {b.devices.length > 1 && b.endMinute - b.startMinute >= 90 && (
                <span className="shrink-0 rounded bg-black/25 px-1 py-0.5 text-[11px] font-bold tabular-nums">×{b.devices.length}</span>
              )}
            </button>
          );
        })}
        {preview && (
          <div
            style={{ left: pct(preview.from), width: pct(preview.to - preview.from) }}
            className="pointer-events-none absolute inset-y-[3px] z-10 flex items-center justify-center rounded-md border-2 border-dashed border-violet-300 bg-violet-500/30 text-[11px] font-bold tabular-nums text-white"
          >
            {bookingClock(preview.from)}–{bookingClock(preview.to)}
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingTimeline({
  items,
  effectiveNow,
  showNowLine,
  onCreate,
  onOpen,
}: {
  items: BookingDto[];
  /** Minutes since 14:00; above the day length on past days, negative on future days. */
  effectiveNow: number;
  showNowLine: boolean;
  onCreate: (device: string, start: number, end: number) => void;
  onOpen: (booking: BookingDto) => void;
}) {
  const { t } = useI18n();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const total = BOOKING_DEVICES.length;
  const minMinute =
    Math.floor(Math.min(Math.max(effectiveNow, 0), BOOKING_DAY_MINUTES) / BOOKING_STEP_MINUTES) * BOOKING_STEP_MINUTES;
  const elapsed = Math.min(Math.max(effectiveNow, 0), BOOKING_DAY_MINUTES);

  const slots = Array.from({ length: BOOKING_SLOTS }, (_, i) => {
    const minute = i * BOOKING_STEP_MINUTES;
    const busy = items
      .filter((b) => b.startMinute <= minute && b.endMinute > minute)
      .reduce((sum, b) => sum + b.devices.length, 0);
    return { minute, busy };
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="relative min-w-[1040px]">
        {/* hour axis */}
        <div className="flex h-8">
          <div style={{ width: LABEL_WIDTH }} className="sticky left-0 z-20 shrink-0 border-r border-zinc-700 bg-zinc-900" />
          <div className="relative flex-1">
            <div
              style={{ left: pct(MIDNIGHT), right: 0 }}
              className="absolute inset-y-0 flex items-start justify-end bg-indigo-500/10 px-1 pt-0.5 text-[10px] text-indigo-300"
            >
              {t('bookings.nextDayMark')}
            </div>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                style={{ left: pct(i * 60) }}
                className="absolute bottom-1 pl-1 text-xs font-semibold tabular-nums text-zinc-300"
              >
                {bookingClock(i * 60)}
              </span>
            ))}
          </div>
        </div>

        {/* how many devices are taken in each half hour */}
        <div className="flex border-t border-zinc-700">
          <div
            style={{ width: LABEL_WIDTH }}
            className="sticky left-0 z-20 flex shrink-0 items-center border-r border-zinc-700 bg-zinc-900 px-2 text-[11px] font-medium text-zinc-400"
          >
            {t('bookings.occupancy')}
          </div>
          <div className="flex h-7 flex-1">
            {slots.map((s) => (
              <div
                key={s.minute}
                title={t('bookings.slotBusy', { time: bookingClock(s.minute), busy: s.busy, total })}
                className={cn(
                  'flex flex-1 items-center justify-center border-r border-zinc-950/40 text-xs tabular-nums',
                  occupancyTone(s.busy, total),
                )}
              >
                {s.busy || '·'}
              </div>
            ))}
          </div>
        </div>

        {BOOKING_DEVICES.map((device) => (
          <DeviceRow
            key={device}
            device={device}
            bookings={items.filter((b) => b.devices.includes(device))}
            effectiveNow={effectiveNow}
            minMinute={minMinute}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onCreate={onCreate}
            onOpen={onOpen}
          />
        ))}

        {/* elapsed part of the day and the "now" line */}
        <div className="pointer-events-none absolute bottom-0 right-0 top-8" style={{ left: LABEL_WIDTH }}>
          {elapsed > 0 && <div className="absolute inset-y-0 left-0 bg-zinc-950/35" style={{ width: pct(elapsed) }} />}
          {showNowLine && (
            <div className="absolute inset-y-0 z-10 w-0.5 bg-red-500" style={{ left: pct(effectiveNow) }}>
              <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
