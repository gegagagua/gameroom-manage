import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/decorators';
import { GamesService } from '../games/games.service';
import { BillingService } from './billing.service';
import { DesktopGamesQuery, DesktopLoginDto, DesktopLogoutDto, HeartbeatDto, VerifyAdminDto } from './desktop.dto';
import { PcKeyGuard } from './pc-key.guard';

const bearer = (header?: string) => (header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined);

/**
 * Endpoints used by the Electron kiosk client. Plain HTTP polling — no sockets.
 * Auth: `x-pc-key` header (shared secret) + optional `Authorization: Bearer <sessionToken>`.
 */
@Public()
@UseGuards(PcKeyGuard)
@Controller('desktop')
export class DesktopController {
  constructor(
    private readonly billing: BillingService,
    private readonly auth: AuthService,
    private readonly games: GamesService,
  ) {}

  /** Game library for the logged-in customer. Fetched on login/resume, not polled. */
  @Get('games')
  async listGames(@Query() q: DesktopGamesQuery, @Headers('authorization') authorization: string | undefined) {
    await this.billing.assertActiveSession(bearer(authorization), q.pcNumber);
    return { items: await this.games.listForDesktop() };
  }

  @Post('heartbeat')
  @HttpCode(200)
  heartbeat(@Body() dto: HeartbeatDto, @Headers('authorization') authorization: string | undefined, @Ip() ip: string) {
    return this.billing.heartbeat(dto, bearer(authorization), { ip });
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: DesktopLoginDto, @Ip() ip: string) {
    return this.billing.pcLogin(dto, { ip });
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: DesktopLogoutDto, @Headers('authorization') authorization: string | undefined) {
    return this.billing.pcLogout(dto, bearer(authorization));
  }

  /** Unlocks the kiosk settings screen with admin credentials. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-admin')
  @HttpCode(200)
  async verifyAdmin(@Body() dto: VerifyAdminDto) {
    return { ok: await this.auth.verifyAdminCredentials(dto.email, dto.password) };
  }
}
