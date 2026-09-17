import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import type { Principal } from '../auth/auth.types';
import { CurrentPrincipal, Roles } from '../auth/decorators';
import { ListAlertsQuery } from './alerts.dto';
import { AlertsService } from './alerts.service';

@Roles('admin')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Query() q: ListAlertsQuery) {
    return this.alerts.list(q);
  }

  @Post('ack-all')
  @HttpCode(200)
  ackAll(@CurrentPrincipal() admin: Principal) {
    return this.alerts.acknowledgeAll(admin.id);
  }

  @Post(':id/ack')
  @HttpCode(200)
  ack(@Param('id', ParseIntPipe) id: number, @CurrentPrincipal() admin: Principal) {
    return this.alerts.acknowledge(id, admin.id);
  }
}
