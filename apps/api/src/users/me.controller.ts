import { Controller, Get, Query } from '@nestjs/common';
import type { Principal } from '../auth/auth.types';
import { CurrentPrincipal, Roles } from '../auth/decorators';
import { PaginationQuery } from '../common/pagination';
import { SessionsService } from '../sessions/sessions.service';
import { BalanceService } from './balance.service';
import { UsersService } from './users.service';

/** The logged-in customer's own profile, balance history and sessions (read-only). */
@Roles('user')
@Controller('me')
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly balance: BalanceService,
    private readonly sessions: SessionsService,
  ) {}

  @Get()
  profile(@CurrentPrincipal() me: Principal) {
    return this.users.get(me.id);
  }

  @Get('transactions')
  transactions(@CurrentPrincipal() me: Principal, @Query() q: PaginationQuery) {
    return this.balance.listTransactions(me.id, q);
  }

  @Get('sessions')
  mySessions(@CurrentPrincipal() me: Principal, @Query() q: PaginationQuery) {
    return this.sessions.list({ userId: me.id }, q);
  }
}
