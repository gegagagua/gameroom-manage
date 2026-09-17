import { useEffect, useState } from 'react';
import { useAppState } from './hooks';
import { useT } from './i18n';
import { MiniWidget } from './screens/MiniWidget';
import { ExpiredOverlay, MessageOverlay, NoticeToast, WarningToast } from './screens/Overlays';
import { LoginScreen } from './screens/LoginScreen';
import { SessionScreen } from './screens/SessionScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const state = useAppState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const lang = state?.config.language ?? 'ka';
  const t = useT(lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') setSettingsOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const mini = state?.windowMode === 'mini' && state.phase === 'active';
  useEffect(() => {
    // the mini widget uses a fixed 16px base instead of the viewport-scaled one
    document.documentElement.classList.toggle('mini-mode', mini);
  }, [mini]);

  if (!state) {
    return (
      <div className="app boot">
        <div className="spinner" />
      </div>
    );
  }

  // While a game runs the same window is a small always-on-top countdown bar.
  if (state.windowMode === 'mini' && state.phase === 'active') {
    return <MiniWidget state={state} t={t} />;
  }

  const settingsAllowed = state.phase === 'idle' || state.phase === 'unconfigured' || state.phase === 'message';
  const showSettings = state.phase === 'unconfigured' || (settingsOpen && settingsAllowed);

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="bg-glow" />

      {showSettings ? (
        <SettingsScreen
          state={state}
          t={t}
          onClose={() => {
            setSettingsOpen(false);
            void window.grm.lockSettings();
          }}
        />
      ) : state.phase === 'active' ? (
        <SessionScreen state={state} t={t} />
      ) : (
        <LoginScreen state={state} t={t} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      {state.phase === 'expired' && <ExpiredOverlay state={state} t={t} />}
      {state.phase === 'message' && !showSettings && <MessageOverlay state={state} t={t} />}
      {state.phase === 'active' && state.warning && <WarningToast warning={state.warning} t={t} />}
      {state.notice && <NoticeToast notice={state.notice} t={t} />}
    </div>
  );
}
