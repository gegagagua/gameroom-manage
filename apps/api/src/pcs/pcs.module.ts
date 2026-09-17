import { Module } from '@nestjs/common';
import { SessionsModule } from '../sessions/sessions.module';
import { PcsController } from './pcs.controller';
import { PcsService } from './pcs.service';

@Module({
  imports: [SessionsModule],
  controllers: [PcsController],
  providers: [PcsService],
})
export class PcsModule {}
