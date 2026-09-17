import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { CreateGameDto, UpdateGameDto } from './games.dto';
import { GamesService } from './games.service';

@Roles('admin')
@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Get()
  list() {
    return this.games.list();
  }

  @Post()
  create(@Body() dto: CreateGameDto) {
    return this.games.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGameDto) {
    return this.games.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.games.remove(id);
  }
}
