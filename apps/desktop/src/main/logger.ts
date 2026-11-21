import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'node:util';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Mirrors console.log/warn/error into <userData>/logs/client.log (one previous file kept as client.old.log),
 * so a PC's problems can be investigated after the fact — packaged builds have no visible console.
 */
export function installFileLogger(userDataDir: string): string {
  const dir = join(userDataDir, 'logs');
  const file = join(dir, 'client.log');
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    return file;
  }
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    /* no file yet */
  }

  const write = (level: string, args: unknown[]) => {
    const line = `${new Date().toISOString()} ${level} ${format(...args)}\n`;
    try {
      if (size + line.length > MAX_BYTES) {
        renameSync(file, join(dir, 'client.old.log'));
        size = 0;
      }
      appendFileSync(file, line, 'utf8');
      size += Buffer.byteLength(line);
    } catch {
      /* logging must never break the app */
    }
  };

  for (const [method, level] of [['log', 'INFO'], ['warn', 'WARN'], ['error', 'ERROR']] as const) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);
      write(level, args);
    };
  }
  process.on('uncaughtException', (err) => console.error(`[process] uncaught: ${err.stack ?? err.message}`));
  process.on('unhandledRejection', (reason) => console.error(`[process] unhandled rejection: ${(reason as Error)?.stack ?? String(reason)}`));
  return file;
}
