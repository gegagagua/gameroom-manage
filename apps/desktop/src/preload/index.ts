import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC, type AppState, type GrmBridge } from '../common/ipc';

const bridge: GrmBridge = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => {
    const handler = (_e: IpcRendererEvent, state: AppState) => listener(state);
    ipcRenderer.on(IPC.state, handler);
    return () => ipcRenderer.removeListener(IPC.state, handler);
  },
  login: (login, password) => ipcRenderer.invoke(IPC.login, login, password),
  logout: () => ipcRenderer.invoke(IPC.logout),
  dismissMessage: () => ipcRenderer.invoke(IPC.dismissMessage),
  launchGame: (gameId) => ipcRenderer.invoke(IPC.launchGame, gameId),
  showLibrary: () => ipcRenderer.invoke(IPC.showLibrary),
  unlockSettings: (email, password) => ipcRenderer.invoke(IPC.unlockSettings, email, password),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  testSettings: (draft) => ipcRenderer.invoke(IPC.testSettings, draft),
  saveSettings: (draft) => ipcRenderer.invoke(IPC.saveSettings, draft),
  lockSettings: () => ipcRenderer.invoke(IPC.lockSettings),
  quit: () => ipcRenderer.invoke(IPC.quit),
};

contextBridge.exposeInMainWorld('grm', bridge);
