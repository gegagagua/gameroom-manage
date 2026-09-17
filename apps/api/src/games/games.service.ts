import { Injectable } from '@nestjs/common';
import { Game, GameLaunchType, Prisma } from '@prisma/client';
import { ApiError, ErrorCode } from '../common/api-error';
import { PrismaService } from '../common/prisma.service';
import { CreateGameDto, UpdateGameDto } from './games.dto';

const ORDER: Prisma.GameOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { name: 'asc' }];

const steamCover = (appId: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
const RIOT_CLIENT = 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe';
const RIOT_PROCESSES = ['RiotClientServices.exe', 'Riot Client.exe'];

/** Seeded once when the catalog is empty. Paths are the default Windows install locations. */
export const DEFAULT_GAMES: Prisma.GameCreateInput[] = [
  {
    name: 'Steam',
    launchType: GameLaunchType.EXE,
    exePath: 'C:\\Program Files (x86)\\Steam\\steam.exe',
    processNames: ['steam.exe', 'steamwebhelper.exe'],
    sortOrder: 0,
  },
  { name: 'Counter-Strike 2', launchType: GameLaunchType.STEAM, steamAppId: 730, processNames: ['cs2.exe'], imageUrl: steamCover(730), sortOrder: 10 },
  { name: 'Dota 2', launchType: GameLaunchType.STEAM, steamAppId: 570, processNames: ['dota2.exe'], imageUrl: steamCover(570), sortOrder: 20 },
  {
    name: 'PUBG: BATTLEGROUNDS',
    launchType: GameLaunchType.STEAM,
    steamAppId: 578080,
    processNames: ['TslGame.exe', 'ExecPubg.exe'],
    imageUrl: steamCover(578080),
    sortOrder: 30,
  },
  {
    name: 'League of Legends',
    launchType: GameLaunchType.EXE,
    exePath: RIOT_CLIENT,
    args: '--launch-product=league_of_legends --launch-patchline=live',
    processNames: ['LeagueClient.exe', 'LeagueClientUx.exe', 'League of Legends.exe', ...RIOT_PROCESSES],
    sortOrder: 40,
  },
  {
    name: 'VALORANT',
    launchType: GameLaunchType.EXE,
    exePath: RIOT_CLIENT,
    args: '--launch-product=valorant --launch-patchline=live',
    processNames: ['VALORANT.exe', 'VALORANT-Win64-Shipping.exe', ...RIOT_PROCESSES],
    sortOrder: 50,
  },
  {
    name: 'Fortnite',
    launchType: GameLaunchType.URL,
    url: 'com.epicgames.launcher://apps/Fortnite?action=launch&silent=true',
    processNames: ['FortniteClient-Win64-Shipping.exe', 'EpicGamesLauncher.exe'],
    sortOrder: 60,
  },
];

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return (await this.prisma.game.findMany({ orderBy: ORDER })).map(toGameDto);
  }

  async listForDesktop() {
    const games = await this.prisma.game.findMany({ where: { isActive: true }, orderBy: ORDER });
    return games.map(toDesktopGame);
  }

  async create(dto: CreateGameDto) {
    const data = normalize(dto);
    assertLaunchConfig({ ...data, launchType: dto.launchType });
    return toGameDto(await this.prisma.game.create({ data: { ...data, name: dto.name, launchType: dto.launchType } }));
  }

  async update(id: number, dto: UpdateGameDto) {
    const existing = await this.findOrThrow(id);
    const data = normalize(dto);
    assertLaunchConfig({ ...existing, ...data });
    return toGameDto(await this.prisma.game.update({ where: { id }, data }));
  }

  async remove(id: number) {
    await this.findOrThrow(id);
    await this.prisma.game.delete({ where: { id } });
    return { ok: true };
  }

  async seedDefaultsIfEmpty() {
    if ((await this.prisma.game.count()) > 0) return 0;
    for (const data of DEFAULT_GAMES) await this.prisma.game.create({ data });
    return DEFAULT_GAMES.length;
  }

  private async findOrThrow(id: number) {
    const game = await this.prisma.game.findUnique({ where: { id } });
    if (!game) throw ApiError.notFound(ErrorCode.GAME_NOT_FOUND, 'Game not found');
    return game;
  }
}

/** Empty strings → null; processNames trimmed + deduplicated. Undefined fields stay undefined (PATCH). */
function normalize(dto: UpdateGameDto) {
  const blankToNull = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null);
  return {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.launchType !== undefined ? { launchType: dto.launchType } : {}),
    ...(dto.steamAppId !== undefined ? { steamAppId: dto.steamAppId } : {}),
    ...(dto.exePath !== undefined ? { exePath: blankToNull(dto.exePath) } : {}),
    ...(dto.args !== undefined ? { args: blankToNull(dto.args) } : {}),
    ...(dto.url !== undefined ? { url: blankToNull(dto.url) } : {}),
    ...(dto.imageUrl !== undefined ? { imageUrl: blankToNull(dto.imageUrl) } : {}),
    ...(dto.processNames !== undefined
      ? { processNames: [...new Set(dto.processNames.map((p) => p.trim()).filter(Boolean))] }
      : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
  };
}

function assertLaunchConfig(g: {
  launchType?: GameLaunchType;
  steamAppId?: number | null;
  exePath?: string | null;
  url?: string | null;
}) {
  const ok =
    (g.launchType === GameLaunchType.STEAM && !!g.steamAppId) ||
    (g.launchType === GameLaunchType.EXE && !!g.exePath) ||
    (g.launchType === GameLaunchType.URL && !!g.url);
  if (!ok) {
    throw ApiError.badRequest(
      ErrorCode.GAME_LAUNCH_CONFIG_INVALID,
      'STEAM requires steamAppId, EXE requires exePath, URL requires url',
    );
  }
}

export function toDesktopGame(g: Game) {
  return {
    id: g.id,
    name: g.name,
    launchType: g.launchType,
    steamAppId: g.steamAppId,
    exePath: g.exePath,
    args: g.args,
    url: g.url,
    processNames: g.processNames,
    imageUrl: g.imageUrl,
  };
}

export function toGameDto(g: Game) {
  return { ...toDesktopGame(g), isActive: g.isActive, sortOrder: g.sortOrder, createdAt: g.createdAt, updatedAt: g.updatedAt };
}
