import { app } from 'electron';
import { execFile } from 'node:child_process';

/**
 * SAFETY: unpackaged (dev) builds never power off the machine — they only log.
 * Set GRM_REAL_SHUTDOWN=1 to test a real shutdown from a dev build.
 */
export function isShutdownDryRun(): boolean {
  return !app.isPackaged && process.env.GRM_REAL_SHUTDOWN !== '1';
}

function shutdownCommand(): [string, string[]] | null {
  switch (process.platform) {
    case 'win32':
      return ['shutdown', ['/s', '/f', '/t', '0']];
    case 'darwin':
      return ['osascript', ['-e', 'tell application "System Events" to shut down']];
    case 'linux':
      return ['systemctl', ['poweroff']];
    default:
      return null;
  }
}

export async function shutdownPc(reason: string): Promise<{ dryRun: boolean; error?: string }> {
  const cmd = shutdownCommand();
  if (isShutdownDryRun()) {
    console.warn(`[power] DRY-RUN shutdown (${reason}) — would run: ${cmd ? `${cmd[0]} ${cmd[1].join(' ')}` : 'n/a'}`);
    return { dryRun: true };
  }
  if (!cmd) return { dryRun: false, error: `unsupported platform ${process.platform}` };
  console.warn(`[power] shutting down (${reason})`);
  return new Promise((resolve) => {
    execFile(cmd[0], cmd[1], (err) => resolve({ dryRun: false, ...(err ? { error: err.message } : {}) }));
  });
}
