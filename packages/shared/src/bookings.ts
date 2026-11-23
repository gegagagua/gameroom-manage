/** Business day runs 14:00 → 02:00. Booking times are minutes since 14:00 (0…720). */
export const BOOKING_OPEN_HOUR = 14;
export const BOOKING_DAY_MINUTES = 720;
export const BOOKING_STEP_MINUTES = 30;
export const BOOKING_SLOTS = BOOKING_DAY_MINUTES / BOOKING_STEP_MINUTES;

export const BOOKING_PCS = Array.from({ length: 10 }, (_, i) => `PC-${i + 1}`);
export const BOOKING_SONYS = ['SONY-1', 'SONY-2'];
export const BOOKING_DEVICES = [...BOOKING_PCS, ...BOOKING_SONYS];

export interface BookingDto {
  id: number;
  date: string;
  startMinute: number;
  endMinute: number;
  devices: string[];
  customerName: string;
  phone: string | null;
  note: string | null;
  status: 'PENDING' | 'CONFIRMED';
  /** Came from the public booking form. */
  online: boolean;
}

export interface BookingsDayResponse {
  date: string;
  /** Current business day and minutes since its 14:00 (negative before opening). */
  now: { date: string; minute: number };
  items: BookingDto[];
}

/** Public view of a day: which devices are taken, with no customer details. */
export interface PublicAvailability {
  date: string;
  now: { date: string; minute: number };
  busy: { device: string; startMinute: number; endMinute: number }[];
}

/** 0 → "14:00", 600 → "00:00", 720 → "02:00" */
export function bookingClock(minute: number): string {
  const total = (BOOKING_OPEN_HOUR * 60 + minute) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** "PC-3" → "PC 3", "SONY-1" → "Sony 1" */
export function bookingDeviceLabel(device: string): string {
  const [kind, number] = device.split('-');
  return `${kind === 'SONY' ? 'Sony' : 'PC'} ${number}`;
}
