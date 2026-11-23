import { Module } from '@nestjs/common';
import { BookingsController, PublicBookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  controllers: [BookingsController, PublicBookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
