import { formatClock } from '@grm/shared';
import { useEffect, useState } from 'react';
import type { AppState } from '../../../common/ipc';
import { beep, useNow } from '../hooks';
import type { Translate } from '../i18n';

/** 180×55 always-on-top timer shown over a running game (kept small so it doesn't cover the game's corner). */
export function MiniWidget({ state, t }: { state: AppState; t: Translate }) {
  const now = useNow(250);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.warning) beep(state.warning.level === 'LOW_1' ? 3 : 2);
  }, [state.warning?.at, state.warning?.level]);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const remaining = state.paused
    ? state.balanceSeconds
    : Math.max(0, Math.ceil(state.balanceSeconds - (now - state.balanceSyncedAt) / 1000));
  const level = remaining <= 60 ? 'critical' : remaining <= 300 ? 'low' : 'ok';
  const pulsing = state.warning ? `pulse-${state.warning.level === 'LOW_1' ? 'critical' : 'low'}` : '';

  return (
    <div className={`mini level-${level} ${pulsing}`}>
      <div className="mini-left">
        <div className="mini-digits">{formatClock(remaining)}</div>
        {state.notice?.kind === 'DRY_RUN_LAUNCH' && <div className="mini-notice">{t('notice.DRY_RUN_LAUNCH', { name: state.notice.detail ?? '' })}</div>}
        {!state.online && <div className="mini-notice warn">{t('status.offline')}</div>}
      </div>
      <div className="mini-actions">
        <button className="mini-btn" onClick={() => void window.grm.showLibrary()}>
          {t('mini.games')}
        </button>
        <button
          className={`mini-btn danger ${confirming ? 'confirming' : ''}`}
          onClick={() => (confirming ? void window.grm.logout() : setConfirming(true))}
        >
          {confirming ? t('mini.confirm') : t('session.logout')}
        </button>
      </div>
    </div>
  );
}
