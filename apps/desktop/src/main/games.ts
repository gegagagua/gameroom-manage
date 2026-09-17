import type { DesktopGame } from '@grm/shared';
import { shell } from 'electron';
import { execFile, spawn } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Game launch only really happens on Windows (the PCs); elsewhere it is logged. Override: GRM_REAL_LAUNCH=1. */
export function isLaunchDryRun(): boolean {
  return process.platform !== 'win32' && process.env.GRM_REAL_LAUNCH !== '1';
}

/** taskkill exists only on Windows; other platforms just log what would be killed. */
export const isKillDryRun = () => process.platform !== 'win32';

export type LaunchResult = { ok: true; dryRun: boolean } | { ok: false; code: string };

/** Last catalog received from the API — kept on disk so games can be killed after a restart or while offline. */
export class GameCatalogCache {
  private readonly path: string;

  constructor(dir: string) {
    this.path = join(dir, 'games.json');
  }

  load(): DesktopGame[] {
    try {
      const data = JSON.parse(readFileSync(this.path, 'utf8')) as { items?: DesktopGame[] };
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  }

  save(items: DesktopGame[]) {
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify({ savedAt: new Date().toISOString(), items }, null, 2), 'utf8');
    renameSync(tmp, this.path);
  }
}

/** Splits a command line into arguments; supports "double" and 'single' quotes. */
export function parseArgs(input: string | null | undefined): string[] {
  if (!input) return [];
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasToken = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
    } else if (/\s/.test(ch)) {
      if (hasToken) args.push(current);
      current = '';
      hasToken = false;
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (hasToken) args.push(current);
  return args;
}

export async function launchGame(game: DesktopGame): Promise<LaunchResult> {
  const plan = launchPlan(game);
  if (!plan) return { ok: false, code: 'GAME_LAUNCH_CONFIG_INVALID' };

  if (isLaunchDryRun()) {
    console.warn(`[games] DRY-RUN launch "${game.name}" — would ${plan.describe}`);
    return { ok: true, dryRun: true };
  }

  try {
    if (plan.kind === 'open') {
      await shell.openExternal(plan.target);
    } else {
      if (!existsSync(plan.exePath)) return { ok: false, code: 'GAME_NOT_INSTALLED' };
      const child = spawn(plan.exePath, plan.args, { detached: true, stdio: 'ignore', cwd: dirname(plan.exePath), windowsHide: false });
      await new Promise<void>((resolve, reject) => {
        child.once('spawn', () => resolve());
        child.once('error', reject);
      });
      child.unref();
    }
    console.log(`[games] launched "${game.name}" (${plan.describe})`);
    return { ok: true, dryRun: false };
  } catch (err) {
    console.error(`[games] launch "${game.name}" failed: ${(err as Error).message}`);
    return { ok: false, code: 'GAME_LAUNCH_FAILED' };
  }
}

type Plan =
  | { kind: 'open'; target: string; describe: string }
  | { kind: 'exe'; exePath: string; args: string[]; describe: string };

function launchPlan(game: DesktopGame): Plan | null {
  switch (game.launchType) {
    case 'STEAM': {
      if (!game.steamAppId || !Number.isInteger(game.steamAppId) || game.steamAppId <= 0) return null;
      const target = `steam://rungameid/${game.steamAppId}`;
      return { kind: 'open', target, describe: `open ${target}` };
    }
    case 'URL': {
      const url = game.url?.trim();
      // any registered protocol (steam://, com.epicgames.launcher://, https://) — but never local files/scripts
      if (!url || !/^[a-z][a-z0-9+.-]*:/i.test(url) || /^(file|javascript|data|vbscript):/i.test(url)) return null;
      return { kind: 'open', target: url, describe: `open ${url}` };
    }
    case 'EXE': {
      const exePath = game.exePath?.trim();
      if (!exePath) return null;
      const args = parseArgs(game.args);
      return { kind: 'exe', exePath, args, describe: `spawn ${JSON.stringify([exePath, ...args])}` };
    }
    default:
      return null;
  }
}

const IMAGE_NAME_RE = /^[\w .()+-]{1,100}\.exe$/i;

/** Kills every process of the given image names (and their child trees). "Not found" is not an error. */
export async function killGames(processNames: string[], reason: string): Promise<void> {
  const names = [...new Set(processNames.map((n) => n.trim()).filter((n) => IMAGE_NAME_RE.test(n)))];
  if (names.length === 0) return;

  if (isKillDryRun()) {
    console.warn(`[games] DRY-RUN kill (${reason}) — would run: taskkill /F /T ${names.map((n) => `/IM ${n}`).join(' ')}`);
    return;
  }
  await new Promise<void>((resolve) => {
    const args = ['/F', '/T', ...names.flatMap((n) => ['/IM', n])];
    execFile('taskkill', args, { windowsHide: true, timeout: 15_000 }, (err, stdout) => {
      // A non-zero exit (128 = "process not found") is expected when some games aren't running — ignore it.
      if (stdout?.trim()) console.log(`[games] taskkill (${reason}): ${stdout.trim().replace(/\s+/g, ' ')}`);
      if (err?.killed) console.warn(`[games] taskkill timed out (${reason})`);
      resolve();
    });
  });
}
