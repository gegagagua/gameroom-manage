import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/app-config';
import { ClockService } from './clock.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [AppConfig, ClockService, PrismaService],
  exports: [AppConfig, ClockService, PrismaService],
})
export class CommonModule {}
