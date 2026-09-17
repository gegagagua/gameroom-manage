import type { AppState } from '../../../common/ipc';
import { useNow } from '../hooks';
import type { Translate } from '../i18n';

export function TopBar({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(1000);
  const locale = state.config.language === 'ka' ? 'ka-GE' : 'en-GB';
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
        <strong>{new Date(now).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</strong>
        <small>{new Date(now).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</small>
      </div>
    </header>
  );
}
