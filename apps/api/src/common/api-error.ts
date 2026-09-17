import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Machine-readable error codes. Clients (web/desktop) translate these — keep in sync with
 * packages/shared/src/errors.ts.
 */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL: 'INTERNAL',

  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  WRONG_CURRENT_PASSWORD: 'WRONG_CURRENT_PASSWORD',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  USER_INACTIVE: 'USER_INACTIVE',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  PHONE_TAKEN: 'PHONE_TAKEN',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_HAS_ACTIVE_SESSION: 'USER_HAS_ACTIVE_SESSION',

  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  NO_BALANCE: 'NO_BALANCE',

  INVALID_PC_KEY: 'INVALID_PC_KEY',
  PC_NOT_FOUND: 'PC_NOT_FOUND',
  ALREADY_LOGGED_IN_ELSEWHERE: 'ALREADY_LOGGED_IN_ELSEWHERE',
  INVALID_SESSION_TOKEN: 'INVALID_SESSION_TOKEN',

  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',

  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_LAUNCH_CONFIG_INVALID: 'GAME_LAUNCH_CONFIG_INVALID',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: unknown) {
    const body: ApiErrorBody = { statusCode: status, code, message, ...(details !== undefined ? { details } : {}) };
    super(body, status);
  }

  static badRequest(code: ErrorCode, message: string, details?: unknown) {
    return new ApiError(HttpStatus.BAD_REQUEST, code, message, details);
  }
  static unauthorized(code: ErrorCode = ErrorCode.UNAUTHORIZED, message = 'Unauthorized') {
    return new ApiError(HttpStatus.UNAUTHORIZED, code, message);
  }
  static forbidden(code: ErrorCode = ErrorCode.FORBIDDEN, message = 'Forbidden') {
    return new ApiError(HttpStatus.FORBIDDEN, code, message);
  }
  static notFound(code: ErrorCode = ErrorCode.NOT_FOUND, message = 'Not found') {
    return new ApiError(HttpStatus.NOT_FOUND, code, message);
  }
  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new ApiError(HttpStatus.CONFLICT, code, message, details);
  }
}
