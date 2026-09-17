import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ApiError, ErrorCode } from '../common/api-error';
import { AppConfig } from '../config/app-config';

/** Desktop endpoints: require the shared PC agent key in the `x-pc-key` header. */
@Injectable()
export class PcKeyGuard implements CanActivate {
  constructor(private readonly config: AppConfig) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const provided = Buffer.from(String(req.headers['x-pc-key'] ?? ''));
    const expected = Buffer.from(this.config.pcAgentKey);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw ApiError.unauthorized(ErrorCode.INVALID_PC_KEY, 'Invalid PC key');
    }
    return true;
  }
}
