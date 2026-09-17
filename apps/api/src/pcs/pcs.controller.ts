import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { PcCommand } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Roles } from '../auth/decorators';
import { PcsService } from './pcs.service';

class RenamePcDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
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

  @Delete(':id/command')
  cancelCommand(@Param('id', ParseIntPipe) id: number) {
    return this.pcs.cancelCommand(id);
  }
}
