import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { Principal } from '../auth/auth.types';
import { CurrentPrincipal, Roles } from '../auth/decorators';
import { PaginationQuery } from '../common/pagination';
import { SessionsService } from '../sessions/sessions.service';
import { BalanceService } from './balance.service';
import { AdjustBalanceDto, CreateUserDto, ListUsersQuery, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly balance: BalanceService,
    private readonly sessions: SessionsService,
  ) {}

  @Get()
  list(@Query() q: ListUsersQuery) {
    return this.users.list(q);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentPrincipal() admin: Principal) {
    return this.users.create(dto, admin.id);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.users.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.users.remove(id);
  }

  @Post(':id/balance')
  @HttpCode(200)
  adjustBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustBalanceDto,
    @CurrentPrincipal() admin: Principal,
  ) {
    return this.balance.adjust(id, dto, admin.id);
  }

  @Get(':id/transactions')
  transactions(@Param('id', ParseIntPipe) id: number, @Query() q: PaginationQuery) {
    return this.balance.listTransactions(id, q);
  }

  @Get(':id/sessions')
  userSessions(@Param('id', ParseIntPipe) id: number, @Query() q: PaginationQuery) {
    return this.sessions.list({ userId: id }, q);
  }
}
