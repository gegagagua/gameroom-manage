import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SessionStatus } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { ClockService } from '../common/clock.service';
import { toUserDto } from '../common/mappers';
import { PrismaService } from '../common/prisma.service';
import { normalizeEmail } from '../common/time';
import { AppConfig } from '../config/app-config';
import { findUserByLogin } from '../users/user-lookup';
import { AdminLoginDto, ChangePasswordDto, ResetPasswordDto, UserLoginDto } from './auth.dto';
import type { Principal, WebJwtPayload } from './auth.types';
import { MailService } from './mail.service';
import { createResetToken, hashPassword, sha256, verifyPassword } from './password';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly mail: MailService,
    private readonly clock: ClockService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { email: normalizeEmail(dto.email) } });
    if (!admin || !(await verifyPassword(dto.password, admin.passwordHash))) {
      throw ApiError.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }
    const principal: Principal = { role: 'admin', id: admin.id, email: admin.email, name: admin.name };
    return { principal, accessToken: await this.signWebToken({ sub: admin.id, role: 'admin', tv: 0 }) };
  }

  async verifyAdminCredentials(email: string, password: string): Promise<boolean> {
    const admin = await this.prisma.admin.findUnique({ where: { email: normalizeEmail(email) } });
    return !!admin && (await verifyPassword(password, admin.passwordHash));
  }

  async userLogin(dto: UserLoginDto) {
    const user = await findUserByLogin(this.prisma, dto.login);
    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw ApiError.unauthorized(ErrorCode.INVALID_CREDENTIALS, 'Invalid login or password');
    }
    if (!user.isActive) throw ApiError.forbidden(ErrorCode.USER_INACTIVE, 'User is deactivated');
    const principal: Principal = { role: 'user', id: user.id, email: user.email, name: user.name };
    return { principal, accessToken: await this.signWebToken({ sub: user.id, role: 'user', tv: user.tokenVersion }) };
  }

  async me(principal: Principal) {
    if (principal.role === 'admin') return { role: 'admin' as const, admin: principal };
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: principal.id },
      include: { sessions: { where: { status: SessionStatus.ACTIVE }, include: { pc: true }, take: 1 } },
    });
    return { role: 'user' as const, user: toUserDto(user, user.sessions[0]) };
  }

  /** Always resolves successfully so the endpoint does not reveal which emails exist. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: normalizeEmail(email), deletedAt: null, isActive: true },
    });
    if (!user) return;

    const { token, hash } = createResetToken();
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hash, expiresAt: new Date(this.clock.now().getTime() + RESET_TOKEN_TTL_MS) },
      }),
    ]);
    const link = `${this.config.webUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.sendPasswordReset(user.email, user.name, link);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const now = this.clock.now();
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(dto.token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt <= now || record.user.deletedAt) {
      throw new ApiError(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_RESET_TOKEN, 'Reset link is invalid or expired');
    }
    const passwordHash = await hashPassword(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    ]);
  }

  /** Returns a fresh token because bumping tokenVersion invalidates the current one. */
  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw ApiError.badRequest(ErrorCode.WRONG_CURRENT_PASSWORD, 'Current password is incorrect');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(dto.newPassword), tokenVersion: { increment: 1 } },
    });
    return this.signWebToken({ sub: updated.id, role: 'user', tv: updated.tokenVersion });
  }

  signWebToken(payload: WebJwtPayload) {
    return this.jwt.signAsync(payload, { expiresIn: this.config.jwtExpiresInSeconds });
  }
}
