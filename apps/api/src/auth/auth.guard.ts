import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../common/prisma.service';
import { AppConfig } from '../config/app-config';
import type { Principal, Role, WebJwtPayload } from './auth.types';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';

export function extractToken(req: Request, cookieName: string): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[cookieName];
}

/** Global guard: every route requires a valid web JWT unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = extractToken(req, this.config.cookieName);
    if (!token) throw ApiError.unauthorized();

    let payload: WebJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<WebJwtPayload>(token);
    } catch {
      throw ApiError.unauthorized();
    }
    if (payload.role !== 'admin' && payload.role !== 'user') throw ApiError.unauthorized();

    const principal = await this.loadPrincipal(payload);
    if (!principal) throw ApiError.unauthorized();
    req.principal = principal;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles && !roles.includes(principal.role)) throw ApiError.forbidden();
    return true;
  }

  private async loadPrincipal(payload: WebJwtPayload): Promise<Principal | null> {
    if (payload.role === 'admin') {
      const admin = await this.prisma.admin.findUnique({ where: { id: payload.sub } });
      return admin ? { role: 'admin', id: admin.id, email: admin.email, name: admin.name } : null;
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt || !user.isActive || user.tokenVersion !== payload.tv) return null;
    return { role: 'user', id: user.id, email: user.email, name: user.name };
  }
}
