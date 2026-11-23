'use client';

import {
  BOOKING_DAY_MINUTES,
  BOOKING_PCS,
  BOOKING_SONYS,
  BOOKING_STEP_MINUTES,
  bookingClock,
  bookingDeviceLabel,
  formatDuration,
  type BookingDto,
  type BookingsDayResponse,
} from '@grm/shared';
import { useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/toast';
import { Badge, Button, ConfirmModal, FormError, Input, Modal, Select } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { cn } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { revalidate } from '@/lib/swr';

export interface BookingDraft {
  booking?: BookingDto;
  date: string;
  startMinute: number;
  endMinute: number;
  devices: string[];
}

const minutes = Array.from({ length: BOOKING_DAY_MINUTES / BOOKING_STEP_MINUTES + 1 }, (_, i) => i * BOOKING_STEP_MINUTES);

export function BookingModal({ draft, onClose }: { draft: BookingDraft; onClose: () => void }) {
  const { t, lang, errText } = useI18n();
  const toast = useToast();
  const existing = draft.booking;
  const [date, setDate] = useState(draft.date);
  const [start, setStart] = useState(draft.startMinute);
  const [end, setEnd] = useState(draft.endMinute);
  const [devices, setDevices] = useState<string[]>(draft.devices);
  const [name, setName] = useState(existing?.customerName ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data } = useSWR<BookingsDayResponse>(date ? withQuery('/bookings', { date }) : null);
  const taken = new Set(
    (data?.items ?? [])
      .filter((b) => b.id !== existing?.id && b.startMinute < end && b.endMinute > start)
      .flatMap((b) => b.devices),
  );
  const hasClash = devices.some((d) => taken.has(d));

  const changeStart = (value: number) => {
    setStart(value);
    if (end <= value) setEnd(Math.min(value + 60, BOOKING_DAY_MINUTES));
  };
  const toggle = (device: string) =>
    setDevices((list) => (list.includes(device) ? list.filter((d) => d !== device) : [...list, device]));

  const save = async () => {
    if (!name.trim()) return setError(t('bookings.nameRequired'));
    if (!devices.length) return setError(t('bookings.deviceRequired'));
    if (hasClash) return setError(t('bookings.deviceBusy'));
    setBusy(true);
    setError(null);
    try {
      const body = { date, startMinute: start, endMinute: end, devices, customerName: name, phone, note };
      if (existing) await api(`/bookings/${existing.id}`, { method: 'PATCH', body });
      else await api('/bookings', { method: 'POST', body });
      await revalidate('/bookings');
      toast.success(t(existing ? 'bookings.updated' : 'bookings.created'));
      onClose();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await api(`/bookings/${existing!.id}`, { method: 'DELETE' });
    await revalidate('/bookings');
    toast.success(t('bookings.deleted'));
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/bookings/${existing!.id}/confirm`, { method: 'POST' });
      await revalidate('/bookings');
      toast.success(t('bookings.confirmed'));
      onClose();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const isPending = existing?.status === 'PENDING';

  const chip = (device: string) => {
    const selected = devices.includes(device);
    const isBusy = taken.has(device);
    return (
      <button
        key={device}
        type="button"
        aria-pressed={selected}
        disabled={isBusy && !selected}
        onClick={() => toggle(device)}
        className={cn(
          'rounded-lg border px-2 py-2 text-xs font-semibold tabular-nums transition',
          selected && !isBusy && 'border-violet-400 bg-violet-600 text-white',
          selected && isBusy && 'border-red-400 bg-red-500/20 text-red-200 line-through',
          !selected && isBusy && 'cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600 line-through',
          !selected && !isBusy && 'border-zinc-700 bg-zinc-950/60 text-zinc-200 hover:border-violet-400',
        )}
      >
        {bookingDeviceLabel(device)}
      </button>
    );
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={t(existing ? 'bookings.edit' : 'bookings.new')}
        footer={
          <>
            {existing && (
              <Button variant="danger" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                {t(isPending ? 'bookings.reject' : 'common.delete')}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button variant={isPending ? 'secondary' : 'primary'} onClick={save} loading={busy}>
              {t('common.save')}
            </Button>
            {isPending && (
              <Button variant="warning" onClick={confirm} loading={busy}>
                {t('bookings.confirm')}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          {existing?.online && <Badge tone="amber">{t('bookings.onlineBadge')}</Badge>}
          <div className="grid grid-cols-3 gap-3">
            <Input label={t('bookings.date')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label={t('bookings.from')} value={start} onChange={(e) => changeStart(Number(e.target.value))}>
              {minutes.slice(0, -1).map((m) => (
                <option key={m} value={m}>
                  {bookingClock(m)}
                </option>
              ))}
            </Select>
            <Select label={t('bookings.to')} value={end} onChange={(e) => setEnd(Number(e.target.value))}>
              {minutes.filter((m) => m > start).map((m) => (
                <option key={m} value={m}>
                  {bookingClock(m)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{t('bookings.devices')}</span>
              <span className="text-xs tabular-nums text-violet-300">
                {t('bookings.selectedSummary', { count: devices.length, duration: formatDuration((end - start) * 60, lang) })}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">{BOOKING_PCS.map(chip)}</div>
            <div className="grid grid-cols-5 gap-1.5">{BOOKING_SONYS.map(chip)}</div>
            {taken.size > 0 && <p className="text-xs text-zinc-500">{t('bookings.busyHint')}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('bookings.customer')} value={name} maxLength={100} autoFocus onChange={(e) => setName(e.target.value)} />
            <Input label={t('bookings.phoneOptional')} value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Input label={t('bookings.noteOptional')} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          <FormError message={error} />
        </div>
      </Modal>
      {existing && (
        <ConfirmModal
          open={confirmDelete}
          title={t(isPending ? 'bookings.rejectTitle' : 'bookings.deleteTitle')}
          message={t('bookings.deleteConfirm', {
            name: existing.customerName,
            time: `${bookingClock(existing.startMinute)}–${bookingClock(existing.endMinute)}`,
          })}
          confirmLabel={t(isPending ? 'bookings.reject' : 'common.delete')}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
