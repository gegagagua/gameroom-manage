import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { AppConfig } from './config/app-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setupApp(app);
  const config = app.get(AppConfig);
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.enableShutdownHooks();
  await app.listen(config.port);
  Logger.log(`API listening on http://localhost:${config.port}/api`, 'Bootstrap');
}

void bootstrap();
