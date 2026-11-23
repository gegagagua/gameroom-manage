import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { PrismaService } from '../common/prisma.service';
import { AppConfig } from '../config/app-config';
import { CreateBookingDto, UpdateBookingDto } from './bookings.dto';

const OPEN_MINUTE = 14 * 60;
const CLOSE_MINUTE = 2 * 60;
const DAY_MINUTES = 720;
const STEP_MINUTES = 30;
/** Advisory-lock namespace: bookings of one business day are checked and written one at a time. */
const LOCK_NAMESPACE = 7301;

const withDevices = { devices: { orderBy: { device: 'asc' } } } satisfies Prisma.BookingInclude;
type BookingRow = Prisma.BookingGetPayload<{ include: typeof withDevices }>;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const deviceOrder = (device: string) => {
  const [kind, number] = device.split('-');
  return (kind === 'SONY' ? 100 : 0) + Number(number);
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly clock: ClockService,
  ) {}

  async day(date: string) {
    const rows = await this.prisma.booking.findMany({
      where: { businessDate: this.parseDate(date) },
      include: withDevices,
      orderBy: [{ startMinute: 'asc' }, { id: 'asc' }],
    });
    return { date, now: this.businessNow(), items: rows.map((r) => this.toDto(r)) };
  }

  async create(dto: CreateBookingDto) {
    this.assertTimes(dto.date, dto.startMinute, dto.endMinute);
    const businessDate = this.parseDate(dto.date);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockDay(tx, dto.date);
      await this.assertFree(tx, businessDate, dto.startMinute, dto.endMinute, dto.devices);
      return tx.booking.create({
        data: {
          businessDate,
          startMinute: dto.startMinute,
          endMinute: dto.endMinute,
          customerName: dto.customerName,
          phone: dto.phone || null,
          note: dto.note || null,
          devices: { create: dto.devices.map((device) => ({ device })) },
        },
        include: withDevices,
      });
    });
    return this.toDto(row);
  }

  async update(id: number, dto: UpdateBookingDto) {
    const current = await this.prisma.booking.findUnique({ where: { id } });
    if (!current) throw ApiError.notFound(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found');

    const date = dto.date ?? ymd(current.businessDate);
    const startMinute = dto.startMinute ?? current.startMinute;
    const endMinute = dto.endMinute ?? current.endMinute;
    const timeChanged =
      date !== ymd(current.businessDate) || startMinute !== current.startMinute || endMinute !== current.endMinute;
    // A finished booking can still get a corrected name or note; only moving it is restricted.
    if (timeChanged) this.assertTimes(date, startMinute, endMinute);
    const businessDate = this.parseDate(date);

    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockDay(tx, date);
      const locked = await tx.booking.findUnique({ where: { id }, include: withDevices });
      if (!locked) throw ApiError.notFound(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found');
      const devices = dto.devices ?? locked.devices.map((d) => d.device);
      await this.assertFree(tx, businessDate, startMinute, endMinute, devices, id);
      if (dto.devices) await tx.bookingDevice.deleteMany({ where: { bookingId: id } });
      return tx.booking.update({
        where: { id },
        data: {
          businessDate,
          startMinute,
          endMinute,
          customerName: dto.customerName,
          phone: dto.phone === undefined ? undefined : dto.phone || null,
          note: dto.note === undefined ? undefined : dto.note || null,
          ...(dto.devices ? { devices: { create: dto.devices.map((device) => ({ device })) } } : {}),
        },
        include: withDevices,
      });
    });
    return this.toDto(row);
  }

  async remove(id: number) {
    const { count } = await this.prisma.booking.deleteMany({ where: { id } });
    if (!count) throw ApiError.notFound(ErrorCode.BOOKING_NOT_FOUND, 'Booking not found');
    return { ok: true };
  }

  /** Current business day in APP_TIMEZONE; 00:00–01:59 still belongs to the previous date. */
  private businessNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(this.clock.now());
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const localDate = `${get('year')}-${get('month')}-${get('day')}`;
    const clockMinute = Number(get('hour')) * 60 + Number(get('minute'));
    if (clockMinute < CLOSE_MINUTE) {
      const previous = new Date(`${localDate}T00:00:00.000Z`);
      previous.setUTCDate(previous.getUTCDate() - 1);
      return { date: ymd(previous), minute: clockMinute + 1440 - OPEN_MINUTE };
    }
    return { date: localDate, minute: clockMinute - OPEN_MINUTE };
  }

  private parseDate(date: string) {
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || ymd(parsed) !== date) {
      throw ApiError.badRequest(ErrorCode.BOOKING_INVALID_TIME, 'Invalid date');
    }
    return parsed;
  }

  private assertTimes(date: string, start: number, end: number) {
    this.parseDate(date);
    if (start >= end || end > DAY_MINUTES || start % STEP_MINUTES !== 0 || end % STEP_MINUTES !== 0) {
      throw ApiError.badRequest(ErrorCode.BOOKING_INVALID_TIME, 'Time must be within 14:00–02:00 in 30-minute steps');
    }
    const now = this.businessNow();
    if (date < now.date || (date === now.date && end <= now.minute)) {
      throw ApiError.badRequest(ErrorCode.BOOKING_IN_PAST, 'Booking is in the past');
    }
  }

  private async lockDay(tx: Prisma.TransactionClient, date: string) {
    const key = Number(date.replaceAll('-', ''));
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, ${key}::int)`;
  }

  private async assertFree(
    tx: Prisma.TransactionClient,
    businessDate: Date,
    start: number,
    end: number,
    devices: string[],
    excludeId?: number,
  ) {
    const clashes = await tx.bookingDevice.findMany({
      where: {
        device: { in: devices },
        booking: {
          businessDate,
          startMinute: { lt: end },
          endMinute: { gt: start },
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      },
      select: { device: true },
    });
    if (clashes.length) {
      const busy = [...new Set(clashes.map((c) => c.device))].sort((a, b) => deviceOrder(a) - deviceOrder(b));
      throw ApiError.conflict(ErrorCode.BOOKING_CONFLICT, 'Device already booked', { devices: busy });
    }
  }

  private toDto(row: BookingRow) {
    return {
      id: row.id,
      date: ymd(row.businessDate),
      startMinute: row.startMinute,
      endMinute: row.endMinute,
      devices: row.devices.map((d) => d.device).sort((a, b) => deviceOrder(a) - deviceOrder(b)),
      customerName: row.customerName,
      phone: row.phone,
      note: row.note,
    };
  }
}
