import type { DesktopGame } from '@grm/shared';
import { useState } from 'react';
import type { AppState } from '../../../common/ipc';
import { errorText, type Translate } from '../i18n';

function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function hue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function GameTile({ game, busy, launching, onLaunch }: { game: DesktopGame; busy: boolean; launching: boolean; onLaunch: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const h = hue(game.name);
  const showImage = game.imageUrl && !imageFailed;

  return (
    <button className={`game-tile ${launching ? 'launching' : ''}`} onClick={onLaunch} disabled={busy} title={game.name}>
      <div
        className="game-art"
        style={showImage ? undefined : { background: `linear-gradient(135deg, hsl(${h} 80% 45%), hsl(${(h + 60) % 360} 85% 30%))` }}
      >
        {showImage ? (
          <img src={game.imageUrl!} alt="" draggable={false} onError={() => setImageFailed(true)} />
        ) : (
          <span className="game-initials">{initials(game.name)}</span>
        )}
        {launching && <div className="game-launching"><div className="spinner" /></div>}
      </div>
      <span className="game-name">{game.name}</span>
    </button>
  );
}

export function GameLibrary({ state, t }: { state: AppState; t: Translate }) {
  const [error, setError] = useState<string | null>(null);
  const lang = state.config.language;

  const launch = async (game: DesktopGame) => {
    setError(null);
    const result = await window.grm.launchGame(game.id);
    if (!result.ok) setError(`${game.name}: ${errorText(result.code, lang, result.details)}`);
  };

  return (
    <section className="library panel">
      <div className="library-header">
        <h2>{t('games.title')}</h2>
        {state.gamesStatus === 'loading' && <span className="muted small">{t('games.loading')}</span>}
        {state.gamesStatus === 'error' && <span className="muted small">{t('games.cached')}</span>}
      </div>
      {error && <div className="alert error">{error}</div>}
      {state.games.length === 0 ? (
        <p className="muted library-empty">{state.gamesStatus === 'loading' ? t('games.loading') : t('games.empty')}</p>
      ) : (
        <div className="game-grid">
          {state.games.map((game) => (
            <GameTile
              key={game.id}
              game={game}
              busy={state.launchingGameId !== null}
              launching={state.launchingGameId === game.id}
              onLaunch={() => void launch(game)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
