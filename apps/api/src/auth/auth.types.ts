export type Role = 'admin' | 'user';

/** JWT used by the web app (cookie) — admin or user. */
export interface WebJwtPayload {
  sub: number;
  role: Role;
  /** token version; for users must equal users.token_version */
  tv: number;
}

/** JWT handed to the desktop client after a PC login; bound to one session and PC. */
export interface PcSessionJwtPayload {
  sub: number; // user id
  sid: number; // session id
  pc: number; // pc number
  typ: 'pc';
}

export interface AdminPrincipal {
  role: 'admin';
  id: number;
  email: string;
  name: string;
}

export interface UserPrincipal {
  role: 'user';
  id: number;
  email: string;
  name: string;
}

export type Principal = AdminPrincipal | UserPrincipal;

declare module 'express-serve-static-core' {
  interface Request {
    principal?: Principal;
  }
}
