import { Controller, Get, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { Public } from './auth/decorators';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { CommonModule } from './common/common.module';
import { SeedService } from './common/seed.service';
import { AppConfig } from './config/app-config';
import { GamesModule } from './games/games.module';
import { PcsModule } from './pcs/pcs.module';
import { ReportsModule } from './reports/reports.module';
import { SessionsModule } from './sessions/sessions.module';
import { UsersModule } from './users/users.module';

const isTest = process.env.NODE_ENV === 'test';

@Public()
@Controller('health')
class HealthController {
  @Get()
  health() {
    return { ok: true, time: new Date() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: isTest ? ['.env.test', '.env'] : ['.env'] }),
    // Background jobs (stale session sweep) are disabled in tests, which drive them manually.
    ...(isTest ? [] : [ScheduleModule.forRoot()]),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 600 }], skipIf: () => isTest }),
    CommonModule,
    JwtModule.registerAsync({
      global: true,
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({ secret: config.jwtSecret }),
    }),
    AuthModule,
    AlertsModule,
    SessionsModule,
    UsersModule,
    PcsModule,
    ReportsModule,
    GamesModule,
  ],
  controllers: [HealthController],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }) },
  ],
})
export class AppModule {}
