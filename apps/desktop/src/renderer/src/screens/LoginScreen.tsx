import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AppState } from '../../../common/ipc';
import { errorText, type Translate } from '../i18n';
import { TopBar } from './TopBar';

export function LoginScreen({ state, t, onOpenSettings }: { state: AppState; t: Translate; onOpenSettings: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);

  // Wipe credentials whenever the screen returns to the lock state.
  useEffect(() => {
    if (state.phase === 'idle') {
      setPassword('');
      loginRef.current?.focus();
    }
  }, [state.phase]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !login.trim() || !password) return;
    setBusy(true);
    setError(null);
    const result = await window.grm.login(login.trim(), password);
    setBusy(false);
    if (result.ok) {
      setLogin('');
      setPassword('');
    } else {
      setError(errorText(result.code, state.config.language, result.details));
    }
  };

  return (
    <div className="screen login-screen">
      <TopBar state={state} t={t} />

      <main className="login-main">
        <form className="panel login-card" onSubmit={submit}>
          <h1 className="glow-title">{t('login.title')}</h1>
          <p className="muted">{state.resuming ? t('login.resuming') : t('login.subtitle')}</p>

          <label className="field">
            <span>{t('login.login')}</span>
            <input
              ref={loginRef}
              autoFocus
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy || state.resuming}
            />
          </label>
          <label className="field">
            <span>{t('login.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || state.resuming}
            />
          </label>

          {error && <div className="alert error">{error}</div>}
          {!state.online && state.lastError && <div className="alert warn">{t('login.offline')} · {errorText(state.lastError, state.config.language)}</div>}

          <button className="btn primary big" type="submit" disabled={busy || state.resuming || !login.trim() || !password}>
            {busy ? t('login.submitting') : t('login.submit')}
          </button>
          <p className="muted small center">{t('login.help')}</p>
        </form>
      </main>

      <footer className="login-footer">
        <span className="muted small">
          v{state.appVersion}
          {state.isDev ? ' · DEV' : ''}
        </span>
        <div className="footer-actions">
          <button className="btn ghost exit-btn" type="button" onClick={() => setExitOpen(true)}>
            ⏻ {t('exit.button')}
          </button>
          <button className="icon-btn" type="button" title={t('login.settings')} onClick={onOpenSettings}>
            ⚙
          </button>
        </div>
      </footer>

      {exitOpen && <ExitDialog state={state} t={t} onClose={() => setExitOpen(false)} />}
    </div>
  );
}

/** Admin password prompt that closes the kiosk app. */
function ExitDialog({ state, t, onClose }: { state: AppState; t: Translate; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    const result = await window.grm.exitApp(password);
    setBusy(false);
    if (!result.ok) {
      setPassword('');
      setError(errorText(result.code, state.config.language));
    }
  };

  return (
    <div className="overlay exit-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="panel login-card" onSubmit={submit}>
        <h2 className="glow-title">⏻ {t('exit.title')}</h2>
        <p className="muted">{t('exit.hint')}</p>
        <label className="field">
          <span>{t('exit.password')}</span>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </label>
        {error && <div className="alert error">{error}</div>}
        <div className="dialog-actions">
          <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
            {t('exit.cancel')}
          </button>
          <button className="btn danger" type="submit" disabled={busy || !password}>
            {t('exit.confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
