import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ApiErrorBody, ErrorCode } from './api-error';

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.TOO_MANY_REQUESTS,
};

/** Normalizes every error into `{ statusCode, code, message, details? }`. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ThrottlerException) {
      return { statusCode: 429, code: ErrorCode.TOO_MANY_REQUESTS, message: 'Too many requests' };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response && 'code' in response) {
        return response as ApiErrorBody;
      }
      // Nest built-ins (ValidationPipe → message: string[])
      const raw = typeof response === 'string' ? response : (response as { message?: unknown }).message;
      const message = Array.isArray(raw) ? raw.join('; ') : String(raw ?? exception.message);
      return {
        statusCode: status,
        code: STATUS_CODES[status] ?? ErrorCode.INTERNAL,
        message,
        ...(Array.isArray(raw) ? { details: raw } : {}),
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { statusCode: HttpStatus.CONFLICT, code: ErrorCode.CONFLICT, message: 'Unique constraint violation', details: exception.meta };
      }
      if (exception.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, code: ErrorCode.NOT_FOUND, message: 'Record not found' };
      }
    }
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, code: ErrorCode.INTERNAL, message: 'Internal server error' };
  }
}
