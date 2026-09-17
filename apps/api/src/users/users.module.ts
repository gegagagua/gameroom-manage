import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { BalanceService } from './balance.service';
import { MeController } from './me.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [SessionsModule],
  controllers: [UsersController, MeController],
  providers: [UsersService, BalanceService],
})
export class UsersModule {}
