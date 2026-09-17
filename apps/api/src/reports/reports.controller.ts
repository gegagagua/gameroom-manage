import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { ReportRangeQuery, ReportSessionsQuery } from './reports.dto';
import { ReportsService } from './reports.service';

@Roles('admin')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@Query() q: ReportRangeQuery) {
    return this.reports.summary(q);
  }

  @Get('sessions')
  sessions(@Query() q: ReportSessionsQuery) {
    return this.reports.sessionsInRange(q);
  }
}
