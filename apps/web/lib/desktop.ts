import { BASE_PATH } from './api';

/** Latest Windows installer (GitHub Release built by .github/workflows/desktop-windows.yml). */
export const DESKTOP_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ??
  'https://github.com/gegagagua/gameroom-manage/releases/latest/download/GameRoomClient-Setup.exe';

/** What a PC should put into Settings → API URL: this site's origin + basePath. */
export function desktopApiUrl() {
  return typeof window === 'undefined' ? '' : `${window.location.origin}${BASE_PATH}`;
}
