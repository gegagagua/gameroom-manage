import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public, Roles } from '../auth/decorators';
import { BookingsDayQuery, CreateBookingDto, PublicBookingDto, UpdateBookingDto } from './bookings.dto';
import { BookingsService } from './bookings.service';

@Roles('admin')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  day(@Query() query: BookingsDayQuery) {
    return this.bookings.day(query.date);
  }

  /** Online requests waiting for an admin, across all days. */
  @Get('pending')
  pending() {
    return this.bookings.pending();
  }

  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.bookings.confirm(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingDto) {
    return this.bookings.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookings.remove(id);
  }
}

/** Used by the landing page. Exposes which devices are taken, never who took them. */
@Public()
@Controller('public/bookings')
export class PublicBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get('availability')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  availability(@Query() query: BookingsDayQuery) {
    return this.bookings.availability(query.date);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  request(@Body() dto: PublicBookingDto) {
    return this.bookings.requestOnline(dto);
  }
}
