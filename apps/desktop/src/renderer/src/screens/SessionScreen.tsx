import { formatClock, formatDuration, secondsToHours } from '@grm/shared';
import { useEffect, useState } from 'react';
import type { AppState } from '../../../common/ipc';
import { useNow } from '../hooks';
import type { Translate } from '../i18n';
import { GameLibrary } from './GameLibrary';
import { TopBar } from './TopBar';

export function SessionScreen({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(250);
  const [confirming, setConfirming] = useState(false);
  const lang = state.config.language;

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const remaining = Math.max(0, Math.ceil(state.balanceSeconds - (now - state.balanceSyncedAt) / 1000));
  const level = remaining <= 60 ? 'critical' : remaining <= 300 ? 'low' : 'ok';
  const startedAt = state.session ? new Date(state.session.startedAt) : null;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt.getTime()) / 1000)) : 0;
  const locale = lang === 'ka' ? 'ka-GE' : 'en-GB';

  const onLogout = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    void window.grm.logout();
  };

  return (
    <div className={`screen session-screen level-${level}`}>
      <TopBar state={state} t={t} />

      {!state.online && <div className="banner offline">{t('session.offline')}</div>}

      <main className="session-layout">
        <aside className="session-side">
          <p className="hello">{t('session.hello', { name: state.user?.name ?? '' })}</p>

          <section className="countdown">
            <span className="countdown-label">{t('session.remaining')}</span>
            <div className="countdown-digits">{formatClock(remaining)}</div>
            <span className="countdown-sub">
              {formatDuration(remaining, lang)} · {t('session.approxHours', { h: secondsToHours(remaining) })}
            </span>
            {level !== 'ok' && <span className="countdown-hint">{t('session.lowHint')}</span>}
          </section>

          <section className="stats">
            <div className="stat panel">
              <span>{t('session.pc')}</span>
              <strong>{state.pc.name ?? t('pc.label', { n: state.pc.number ?? '—' })}</strong>
            </div>
            <div className="stat panel">
              <span>{t('session.started')}</span>
              <strong>{startedAt ? startedAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '—'}</strong>
            </div>
            <div className="stat panel">
              <span>{t('session.elapsed')}</span>
              <strong className="mono">{formatClock(elapsed)}</strong>
            </div>
          </section>

          <button className={`btn danger big logout-btn ${confirming ? 'confirming' : ''}`} onClick={onLogout}>
            {confirming ? t('session.logoutConfirm') : t('session.logout')}
          </button>
        </aside>

        <GameLibrary state={state} t={t} />
      </main>
    </div>
  );
}
