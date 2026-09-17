import { screen, type BrowserWindow, type Rectangle } from 'electron';
import type { WindowMode } from '../common/ipc';

export const MINI_WIDTH = 360;
export const MINI_HEIGHT = 110;
const MINI_MARGIN = 12;

const sameBounds = (a: Rectangle, b: Rectangle) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

/**
 * Owns the geometry of the single app window:
 *  - full (kiosk): exactly the primary display bounds (covers the taskbar), fullscreen, not resizable/movable;
 *  - mini: fixed ~360×110 always-on-top widget in the top-right of the work area while a game runs.
 * Kiosk focus rules in index.ts must check `mode === 'full'`.
 */
export class WindowController {
  mode: WindowMode = 'full';
  private normalBounds: Rectangle | null = null;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    /** false only for the dev-only GRM_WINDOWED=1 opt-out */
    private readonly kiosk: boolean,
  ) {}

  /** Serialized: overlapping calls (launch → immediate session end) apply in order. */
  setMode(mode: WindowMode): Promise<void> {
    return this.enqueue(async (win) => {
      this.mode = mode;
      if (mode === 'mini') await this.toMini(win);
      else this.toFull(win);
      const b = win.getBounds();
      console.log(`[window] mode=${mode} bounds=${b.width}x${b.height}@${b.x},${b.y} kiosk=${win.isKiosk()} fullscreen=${win.isFullScreen()} resizable=${win.isResizable()} alwaysOnTop=${win.isAlwaysOnTop()}`);
    });
  }

  /** Re-applies the current mode's geometry (display changed, OS maximize/move/resize attempts, left fullscreen). */
  enforce(): Promise<void> {
    return this.enqueue(async (win) => {
      if (this.mode === 'mini') this.placeMini(win);
      else if (this.kiosk) this.applyKiosk(win);
      const b = win.getBounds();
      const d = screen.getPrimaryDisplay().bounds;
      console.log(`[window] enforce mode=${this.mode} bounds=${b.width}x${b.height}@${b.x},${b.y} display=${d.width}x${d.height} kiosk=${win.isKiosk()} fullscreen=${win.isFullScreen()} resizable=${win.isResizable()} movable=${win.isMovable()}`);
    });
  }

  private enqueue(fn: (win: BrowserWindow) => Promise<void>) {
    this.queue = this.queue
      .then(async () => {
        const win = this.getWindow();
        if (win && !win.isDestroyed()) await fn(win);
      })
      .catch((err) => console.error(`[window] ${(err as Error).message}`));
    return this.queue;
  }

  private applyKiosk(win: BrowserWindow) {
    const bounds = screen.getPrimaryDisplay().bounds; // full display, not workArea → taskbar is covered
    win.setResizable(false);
    win.setMovable(false);
    if (!win.isKiosk()) win.setKiosk(true);
    if (!win.isFullScreen()) win.setFullScreen(true);
    // macOS native fullscreen owns the frame (own Space); on Windows/Linux pin the exact display bounds.
    if (process.platform !== 'darwin' && !sameBounds(win.getBounds(), bounds)) win.setBounds(bounds);
    win.setAlwaysOnTop(true, 'screen-saver');
  }

  private placeMini(win: BrowserWindow) {
    const area = screen.getPrimaryDisplay().workArea;
    const target = {
      x: area.x + area.width - MINI_WIDTH - MINI_MARGIN,
      y: area.y + MINI_MARGIN,
      width: MINI_WIDTH,
      height: MINI_HEIGHT,
    };
    if (!sameBounds(win.getBounds(), target)) win.setBounds(target);
    win.setAlwaysOnTop(true, 'screen-saver');
  }

  private async toMini(win: BrowserWindow) {
    if (!this.kiosk && !win.isFullScreen()) this.normalBounds = win.getBounds();
    if (win.isKiosk()) win.setKiosk(false);
    if (win.isFullScreen()) await leaveFullScreen(win);

    // Fixed widget: not resizable, not movable, no taskbar button, never steals focus from the game.
    win.setMinimumSize(1, 1);
    win.setResizable(false);
    win.setMovable(false);
    win.setSkipTaskbar(true);
    this.placeMini(win);
    win.showInactive();
  }

  private toFull(win: BrowserWindow) {
    win.setSkipTaskbar(false);
    if (this.kiosk) {
      this.applyKiosk(win);
    } else {
      win.setAlwaysOnTop(false);
      win.setResizable(true);
      win.setMovable(true);
      if (this.normalBounds) win.setBounds(this.normalBounds);
    }
    win.show();
    win.moveTop();
    win.focus();
  }
}

function leaveFullScreen(win: BrowserWindow) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(done, 1500);
    function done() {
      clearTimeout(timer);
      win.removeListener('leave-full-screen', done);
      resolve();
    }
    win.once('leave-full-screen', done);
    win.setFullScreen(false);
  });
}
