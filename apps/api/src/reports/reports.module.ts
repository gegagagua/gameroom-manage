import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [SessionsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
