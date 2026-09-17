import type { GrmBridge } from '../../common/ipc';

declare global {
  interface Window {
    grm: GrmBridge;
  }
}

declare module '*.css';
