import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BillingService } from './billing.service';

@Injectable()
export class StaleSessionsTask {
  private readonly logger = new Logger(StaleSessionsTask.name);
  private running = false;

  constructor(private readonly billing: BillingService) {}

  @Interval(30_000)
  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.billing.closeStaleSessions();
    } catch (err) {
      this.logger.error(`Stale session sweep failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
