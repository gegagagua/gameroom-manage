import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

/** Shared HTTP setup for main.ts and e2e tests. */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  // Behind Next.js rewrites / reverse proxies: use X-Forwarded-For for PC IP addresses.
  (app as NestExpressApplication).set('trust proxy', true);
}
