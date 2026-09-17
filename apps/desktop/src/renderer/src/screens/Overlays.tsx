import { endReasonLabels } from '@grm/shared';
import { useEffect } from 'react';
import type { AppState } from '../../../common/ipc';
import { beep, useNow } from '../hooks';
import type { Key, Translate } from '../i18n';

const secondsUntil = (ts: number, now: number) => Math.max(0, Math.ceil((ts - now) / 1000));

export function ExpiredOverlay({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(250);
  const expired = state.expired;

  useEffect(() => {
    beep(4, 660);
  }, []);

  if (!expired) return null;
  const s = secondsUntil(expired.until, now);

  return (
    <div className="overlay expired">
      <div className="overlay-card">
        <div className="overlay-icon">⏱</div>
        <h1 className="overlay-title">{t('expired.title')}</h1>
        <p className="overlay-text">{t('expired.subtitle')}</p>
        <div className="overlay-count">{s}</div>
        <p className="overlay-text">{expired.willShutdown ? t('expired.shutdownIn', { s }) : t('expired.lockIn', { s })}</p>
        {expired.willShutdown && expired.dryRun && <p className="muted small">{t('expired.dryRun')}</p>}
      </div>
    </div>
  );
}

export function MessageOverlay({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(250);
  const message = state.message;
  const isShutdown = message?.kind === 'COMMAND_SHUTDOWN';

  useEffect(() => {
    if (isShutdown) beep(3, 520);
  }, [isShutdown]);

  if (!message) return null;
  const lang = state.config.language;

  return (
    <div className={`overlay message ${isShutdown ? 'danger' : ''}`}>
      <div className="overlay-card">
        <div className="overlay-icon">{isShutdown ? '⏻' : 'ℹ'}</div>
        <h1 className="overlay-title">{t(`message.${message.kind}` as Key)}</h1>
        {message.reason && <p className="overlay-text">{t('message.reason', { reason: endReasonLabels[lang][message.reason] })}</p>}
        {isShutdown && message.shutdownAt ? (
          <>
            <div className="overlay-count">{secondsUntil(message.shutdownAt, now)}</div>
            <p className="overlay-text">{t('message.shutdownIn', { s: secondsUntil(message.shutdownAt, now) })}</p>
          </>
        ) : (
          <button className="btn primary big" onClick={() => void window.grm.dismissMessage()}>
            {t('message.ok')}
          </button>
        )}
      </div>
    </div>
  );
}

export function WarningToast({ warning, t }: { warning: NonNullable<AppState['warning']>; t: Translate }) {
  useEffect(() => {
    beep(warning.level === 'LOW_1' ? 3 : 2);
  }, [warning.at, warning.level]);

  return (
    <div className={`toast warning ${warning.level === 'LOW_1' ? 'critical' : ''}`} key={warning.at}>
      <strong>{t(`warning.${warning.level}`)}</strong>
      <span>{t('warning.hint')}</span>
    </div>
  );
}

export function NoticeToast({ notice, t }: { notice: NonNullable<AppState['notice']>; t: Translate }) {
  return (
    <div className="toast notice">
      <strong>{t(`notice.${notice.kind}`)}</strong>
    </div>
  );
}
