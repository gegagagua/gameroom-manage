import type { AppState } from '../../../common/ipc';
import { useNow } from '../hooks';
import { formatClockTime, formatShortDate, type Translate } from '../i18n';

export function TopBar({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(1000);
  const pcLabel = state.pc.number ? t('pc.label', { n: state.pc.number }) : t('pc.unassigned');

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">▶</span>
        {t('brand')}
      </div>
      <div className="topbar-center">
        <span className="pc-chip">
          {pcLabel}
          {state.pc.name && state.pc.name !== pcLabel ? <small>{state.pc.name}</small> : null}
        </span>
        <span className={`status-dot ${state.online ? 'on' : 'off'}`}>
          {state.online ? t('status.online') : t('status.offline')}
        </span>
      </div>
      <div className="topbar-clock">
        <strong>{formatClockTime(new Date(now))}</strong>
        <small>{formatShortDate(new Date(now), state.config.language)}</small>
      </div>
    </header>
  );
}
