import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { Principal, Role } from './auth.types';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Skip web JWT authentication (login endpoints, desktop endpoints guarded by PcKeyGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restrict an authenticated route to the given roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentPrincipal = createParamDecorator((_: unknown, ctx: ExecutionContext): Principal => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return req.principal!;
});
