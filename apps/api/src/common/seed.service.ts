import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { hashPassword, verifyPassword } from '../auth/password';
import { AppConfig } from '../config/app-config';
import { GamesService } from '../games/games.service';
import { PrismaService } from './prisma.service';

/** Ensures the predefined admin (from env), PCs 1..PC_COUNT and (once) the default game catalog exist. */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
    private readonly games: GamesService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureAdmin();
    await this.ensurePcs();
    const seeded = await this.games.seedDefaultsIfEmpty();
    if (seeded) this.logger.log(`Seeded ${seeded} default game(s)`);
  }

  private async ensureAdmin() {
    const { adminEmail: email, adminPassword: password, adminName: name } = this.config;
    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (!existing) {
      await this.prisma.admin.create({ data: { email, name, passwordHash: await hashPassword(password) } });
      this.logger.log(`Created admin ${email}`);
      return;
    }
    const passwordChanged = !(await verifyPassword(password, existing.passwordHash));
    if (passwordChanged || existing.name !== name) {
      await this.prisma.admin.update({
        where: { id: existing.id },
        data: { name, ...(passwordChanged ? { passwordHash: await hashPassword(password) } : {}) },
      });
      this.logger.log(`Updated admin ${email}`);
    }
  }

  private async ensurePcs() {
    const data = Array.from({ length: this.config.pcCount }, (_, i) => ({
      number: i + 1,
      name: `PC-${String(i + 1).padStart(2, '0')}`,
    }));
    const { count } = await this.prisma.pc.createMany({ data, skipDuplicates: true });
    if (count) this.logger.log(`Registered ${count} PC(s)`);
  }
}
