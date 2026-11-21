import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { PcCommand } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { Roles } from '../auth/decorators';
import { PcsService } from './pcs.service';

class RenamePcDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}

class StartSessionDto {
  @IsInt()
  @Min(1)
  userId: number;
}

class PcCommandDto {
  @IsEnum(PcCommand)
  command: PcCommand;
}

@Roles('admin')
@Controller('pcs')
export class PcsController {
  constructor(private readonly pcs: PcsService) {}

  @Get()
  list() {
    return this.pcs.list();
  }

  @Patch(':id')
  rename(@Param('id', ParseIntPipe) id: number, @Body() dto: RenamePcDto) {
    return this.pcs.rename(id, dto.name);
  }

  @Post(':id/command')
  @HttpCode(200)
  command(@Param('id', ParseIntPipe) id: number, @Body() dto: PcCommandDto) {
    return this.pcs.issueCommand(id, dto.command);
  }

  /** Seat a customer on the PC from the web; billing starts when the PC picks it up (≤ 1 heartbeat). */
  @Post(':id/session')
  @HttpCode(200)
  startSession(@Param('id', ParseIntPipe) id: number, @Body() dto: StartSessionDto) {
    return this.pcs.startSession(id, dto.userId);
  }

  @Post(':id/session/pause')
  @HttpCode(200)
  pause(@Param('id', ParseIntPipe) id: number) {
    return this.pcs.setPaused(id, true);
  }

  @Post(':id/session/resume')
  @HttpCode(200)
  resume(@Param('id', ParseIntPipe) id: number) {
    return this.pcs.setPaused(id, false);
  }

  @Delete(':id/command')
  cancelCommand(@Param('id', ParseIntPipe) id: number) {
    return this.pcs.cancelCommand(id);
  }
}
