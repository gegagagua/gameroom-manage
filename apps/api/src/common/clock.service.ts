import { Injectable } from '@nestjs/common';

/** Single source of "now" so billing can be tested with a controllable clock. */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }
}
