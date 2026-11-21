import { app, BrowserWindow, ipcMain, Menu, powerMonitor, powerSaveBlocker, screen } from 'electron';
import { join } from 'node:path';
import { IPC, type DesktopConfig } from '../common/ipc';
import { setAppVersion } from './api-client';
import { ConfigStore } from './config-store';
import { installFileLogger } from './logger';
import { SessionManager } from './session-manager';
import { WindowController } from './window-mode';

const isDev = !app.isPackaged;
/**
 * Full-screen kiosk is the DEFAULT in every build (100% of the primary display, not resizable).
 * GRM_WINDOWED=1 is a dev-only opt-out and is ignored in packaged builds.
 */
const windowed = isDev && process.env.GRM_WINDOWED === '1';
const kiosk = !windowed;

let mainWindow: BrowserWindow | null = null;
let allowQuit = false;
let manager: SessionManager | null = null;
const windowCtl = new WindowController(() => mainWindow, kiosk);

// Warning beeps must play without a user gesture; no pinch/overscroll zoom.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-pinch');
// While a game has focus the client is a background app: don't let Chromium throttle its timers.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
if (process.platform === 'win32') app.setAppUserModelId('ge.gameroom.client');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    if (windowCtl.mode === 'full') mainWindow.focus();
  });
  void app.whenReady().then(start);
}

function start() {
  const logFile = installFileLogger(app.getPath('userData'));
  console.log(`[app] start v${app.getVersion()} packaged=${app.isPackaged} log=${logFile}`);
  setAppVersion(app.getVersion());
  // The heartbeat must keep running while a game is in the foreground (Windows may otherwise suspend/throttle us).
  powerSaveBlocker.start('prevent-app-suspension');
  if (kiosk) Menu.setApplicationMenu(null);

  const store = new ConfigStore(app.getPath('userData'));
  manager = new SessionManager(store, (state) => mainWindow?.webContents.send(IPC.state, state), {
    appVersion: app.getVersion(),
    isDev,
    userDataDir: app.getPath('userData'),
    setWindowMode: (mode) => windowCtl.setMode(mode),
    onQuit: () => {
      allowQuit = true;
      manager?.stop();
      setImmediate(() => app.quit());
    },
  });
  registerIpc(manager);
  createWindow();

  if (kiosk) {
    for (const event of ['display-metrics-changed', 'display-added', 'display-removed'] as const) {
      screen.on(event as 'display-added', () => void windowCtl.enforce());
    }
  }

  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: store.get().autoStart });
  manager.start();
  powerMonitor.on('resume', () => manager?.onSystemResume());
}

function createWindow() {
  const display = screen.getPrimaryDisplay().bounds;
  mainWindow = new BrowserWindow({
    ...(kiosk
      ? { x: display.x, y: display.y, width: display.width, height: display.height }
      : { width: 1280, height: 800, minWidth: 960, minHeight: 640 }),
    show: false,
    backgroundColor: '#05060d',
    title: 'Game Room',
    kiosk,
    fullscreen: kiosk,
    fullscreenable: true, // needed to enter fullscreen; leaving it is reverted below
    resizable: !kiosk,
    movable: !kiosk,
    minimizable: !kiosk,
    maximizable: !kiosk,
    closable: !kiosk,
    alwaysOnTop: kiosk,
    frame: !kiosk,
    thickFrame: !kiosk, // Windows: no resize border
    hasShadow: !kiosk,
    roundedCorners: !kiosk,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      spellcheck: false,
      zoomFactor: 1,
    },
  });

  const win = mainWindow;
  win.once('ready-to-show', () => {
    if (kiosk) void windowCtl.enforce();
    win.show();
  });

  // Never leave the app: block navigation and popups.
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Zoom is always locked (keyboard, Ctrl+wheel, pinch).
  win.webContents.on('did-finish-load', () => {
    void win.webContents.setVisualZoomLevelLimits(1, 1);
    win.webContents.setZoomFactor(1);
  });
  win.webContents.on('zoom-changed', () => win.webContents.setZoomFactor(1));

  win.webContents.on('before-input-event', (e, input) => {
    const key = input.key.toLowerCase();
    const mod = input.control || input.meta;
    if (mod && ['+', '-', '=', '_', '0'].includes(key)) {
      e.preventDefault();
      return;
    }
    // Alt+F4, Ctrl/Cmd+W/Q, reload and fullscreen/devtools keys
    if (kiosk && ((input.alt && key === 'f4') || (mod && ['w', 'q', 'r'].includes(key)) || key === 'f5' || key === 'f11' || key === 'f12')) {
      e.preventDefault();
    }
  });

  if (kiosk) {
    // The user can never change the window size or position — in full or mini mode.
    win.on('will-resize', (e) => e.preventDefault());
    win.on('will-move', (e) => e.preventDefault());
    win.on('resized', () => void windowCtl.enforce());
    win.on('moved', () => void windowCtl.enforce());
    win.on('maximize', () => void windowCtl.enforce());
    win.on('unmaximize', () => void windowCtl.enforce());
    win.on('minimize', () => {
      win.restore();
      void windowCtl.enforce();
    });
    win.on('leave-full-screen', () => {
      if (!allowQuit && windowCtl.mode === 'full') void windowCtl.enforce();
    });
    win.on('close', (e) => {
      if (!allowQuit) e.preventDefault();
    });
    // Kiosk refocus applies only in full mode — in mini mode the game must keep focus.
    win.on('blur', () => {
      if (!allowQuit && windowCtl.mode === 'full') win.focus();
    });
  }
  win.on('closed', () => {
    mainWindow = null;
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(__dirname, '../renderer/index.html'));
}

function registerIpc(m: SessionManager) {
  ipcMain.handle(IPC.getState, () => m.getState());
  ipcMain.handle(IPC.login, (_e, login: string, password: string) => m.login(String(login ?? ''), String(password ?? '')));
  ipcMain.handle(IPC.logout, () => m.logout());
  ipcMain.handle(IPC.dismissMessage, () => m.dismissMessage());
  ipcMain.handle(IPC.launchGame, (_e, gameId: number) => m.launch(Number(gameId)));
  ipcMain.handle(IPC.showLibrary, () => m.showLibrary());
  ipcMain.handle(IPC.openApp, (_e, app: unknown) => m.openApp(app === 'discord' ? 'discord' : 'desktop'));
  ipcMain.handle(IPC.unlockSettings, (_e, email: string, password: string) => m.unlockSettings(String(email ?? ''), String(password ?? '')));
  ipcMain.handle(IPC.getSettings, () => m.getSettings());
  ipcMain.handle(IPC.testSettings, (_e, draft: DesktopConfig) => m.testSettings(draft));
  ipcMain.handle(IPC.saveSettings, (_e, draft: DesktopConfig) => m.saveSettings(draft));
  ipcMain.handle(IPC.lockSettings, () => m.lockSettings());
  ipcMain.handle(IPC.quit, () => m.quit());
  ipcMain.handle(IPC.exitApp, (_e, password: string) => m.exitApp(String(password ?? '')));
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', (e) => {
  if (kiosk && !allowQuit) e.preventDefault();
});
