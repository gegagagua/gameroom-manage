import { useEffect, useState, type FormEvent } from 'react';
import type { AppState, DesktopConfig, SettingsPayload } from '../../../common/ipc';
import { errorText, type Translate } from '../i18n';

type Busy = null | 'unlock' | 'test' | 'save' | 'quit';
type Status = { kind: 'ok' | 'error'; text: string } | null;

const PC_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

export function SettingsScreen({ state, t, onClose }: { state: AppState; t: Translate; onClose: () => void }) {
  const lang = state.config.language;
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [draft, setDraft] = useState<DesktopConfig | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<Status>(null);
  const [checked, setChecked] = useState(false);

  const load = async () => {
    const p = await window.grm.getSettings();
    if (p) {
      setPayload(p);
      setDraft(p.config);
    }
    setChecked(true);
  };

  useEffect(() => {
    void load();
  }, []);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('unlock');
    setStatus(null);
    const r = await window.grm.unlockSettings(email.trim(), password);
    setBusy(null);
    setPassword('');
    if (r.ok) await load();
    else setStatus({ kind: 'error', text: errorText(r.code, lang) });
  };

  const update = <K extends keyof DesktopConfig>(key: K, value: DesktopConfig[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setStatus(null);
  };

  const test = async () => {
    if (!draft) return;
    setBusy('test');
    setStatus(null);
    const r = await window.grm.testSettings(draft);
    setBusy(null);
    setStatus(r.ok ? { kind: 'ok', text: t('settings.testOk', { name: r.pcName ?? '' }) } : { kind: 'error', text: errorText(r.code, lang) });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy('save');
    const r = await window.grm.saveSettings(draft);
    setBusy(null);
    setStatus(r.ok ? { kind: 'ok', text: t('settings.saved') } : { kind: 'error', text: errorText(r.code, lang) });
  };

  const quit = async () => {
    setBusy('quit');
    const r = await window.grm.quit();
    setBusy(null);
    if (!r.ok) setStatus({ kind: 'error', text: errorText(r.code, lang) });
  };

  const header = (
    <div className="settings-header">
      <h1 className="glow-title">{t('settings.title')}</h1>
      <button className="btn ghost" type="button" onClick={onClose} disabled={!state.configured}>
        {t('settings.close')}
      </button>
    </div>
  );

  if (!checked) return <div className="screen settings-screen" />;

  if (!draft) {
    return (
      <div className="screen settings-screen">
        <form className="panel settings-card narrow" onSubmit={unlock}>
          {header}
          <h2>{t('settings.unlockTitle')}</h2>
          <p className="muted">{t('settings.unlockHint')}</p>
          <label className="field">
            <span>{t('settings.email')}</span>
            <input autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </label>
          <label className="field">
            <span>{t('settings.password')}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {status && <div className={`alert ${status.kind === 'ok' ? 'ok' : 'error'}`}>{status.text}</div>}
          <button className="btn primary big" type="submit" disabled={busy !== null || !email || !password}>
            {t('settings.unlock')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="screen settings-screen">
      <form className="panel settings-card" onSubmit={save}>
        {header}
        {!state.configured && <div className="alert warn">{t('settings.firstRun')}</div>}
        {state.isDev && <div className="alert info">{t('settings.devBuild')}</div>}
        {payload && payload.envOverrides.length > 0 && (
          <div className="alert info">{t('settings.envOverrides', { vars: payload.envOverrides.join(', ') })}</div>
        )}

        <label className="field">
          <span>{t('settings.apiUrl')}</span>
          <input value={draft.apiUrl} onChange={(e) => update('apiUrl', e.target.value)} placeholder="http://localhost:4000" spellCheck={false} />
          <small className="muted">{t('settings.apiUrlHint')}</small>
        </label>

        <div className="field">
          <span>{t('settings.pcNumber')}</span>
          <div className="pc-grid">
            {PC_NUMBERS.map((n) => (
              <button
                key={n}
                type="button"
                className={`pc-cell ${draft.pcNumber === n ? 'selected' : ''}`}
                onClick={() => update('pcNumber', n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>{t('settings.pcKey')}</span>
          <div className="input-row">
            <input
              type={showKey ? 'text' : 'password'}
              value={draft.pcKey}
              onChange={(e) => update('pcKey', e.target.value)}
              spellCheck={false}
            />
            <button className="btn ghost" type="button" onClick={() => setShowKey((v) => !v)}>
              {showKey ? t('settings.hide') : t('settings.show')}
            </button>
          </div>
        </label>

        <div className="field-row">
          <div className="field">
            <span>{t('settings.language')}</span>
            <div className="segmented">
              {(['ka', 'en'] as const).map((l) => (
                <button key={l} type="button" className={draft.language === l ? 'selected' : ''} onClick={() => update('language', l)}>
                  {l === 'ka' ? 'ქართული' : 'English'}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>{t('settings.shutdownDelay')}</span>
            <input
              type="number"
              min={5}
              max={600}
              value={draft.shutdownDelaySeconds}
              onChange={(e) => update('shutdownDelaySeconds', Number(e.target.value))}
            />
          </label>
        </div>

        <label className="check">
          <input type="checkbox" checked={draft.shutdownOnExpire} onChange={(e) => update('shutdownOnExpire', e.target.checked)} />
          <span>{t('settings.shutdownOnExpire')}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={draft.autoStart} onChange={(e) => update('autoStart', e.target.checked)} />
          <span>{t('settings.autoStart')}</span>
        </label>

        {status && <div className={`alert ${status.kind === 'ok' ? 'ok' : 'error'}`}>{status.text}</div>}

        <div className="settings-actions">
          <button className="btn ghost" type="button" onClick={test} disabled={busy !== null}>
            {t('settings.test')}
          </button>
          <button className="btn primary" type="submit" disabled={busy !== null}>
            {t('settings.save')}
          </button>
        </div>

        <div className="settings-footer">
          <small className="muted">
            {t('settings.configPath')}: <code>{payload?.configPath}</code>
          </small>
          <button className="btn danger" type="button" onClick={quit} disabled={busy !== null}>
            {t('settings.quit')}
          </button>
        </div>
      </form>
    </div>
  );
}
