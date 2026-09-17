import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AppConfig } from '../config/app-config';
import { AdminLoginDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, UserLoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import type { Principal } from './auth.types';
import { CurrentPrincipal, Public, Roles } from './decorators';

const LOGIN_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('admin/login')
  @HttpCode(200)
  async adminLogin(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.adminLogin(dto);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: UserLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.userLogin(dto);
    this.setCookie(res, result.accessToken);
    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.config.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@CurrentPrincipal() principal: Principal) {
    return this.auth.me(principal);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email);
    return { ok: true };
  }

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { ok: true };
  }

  @Roles('user')
  @Post('change-password')
  @HttpCode(200)
  async changePassword(
    @CurrentPrincipal() principal: Principal,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = await this.auth.changePassword(principal.id, dto);
    this.setCookie(res, accessToken);
    return { ok: true, accessToken };
  }

  private setCookie(res: Response, token: string) {
    res.cookie(this.config.cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
      maxAge: this.config.jwtExpiresInSeconds * 1000,
    });
  }
}
