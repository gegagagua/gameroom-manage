import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { AuthModule } from '../auth/auth.module';
import { GamesModule } from '../games/games.module';
import { BillingService } from './billing.service';
import { DesktopController } from './desktop.controller';
import { PcKeyGuard } from './pc-key.guard';
import { SessionsService } from './sessions.service';
import { StaleSessionsTask } from './stale-sessions.task';

@Module({
  imports: [AlertsModule, AuthModule, GamesModule],
  controllers: [DesktopController],
  providers: [BillingService, SessionsService, StaleSessionsTask, PcKeyGuard],
  exports: [BillingService, SessionsService],
})
export class SessionsModule {}
