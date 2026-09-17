'use client';

import type { GameDto, GameInput, GameLaunchType } from '@grm/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { GameThumb } from './game-thumb';
import { Button, Checkbox, FormError, Input, Modal, Select } from './ui';

export const steamCoverUrl = (appId: number | string) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

/** "cs2.exe, steam.exe,,cs2.exe" → ["cs2.exe", "steam.exe"] (server dedupes too). */
export const parseProcessNames = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),
];

/** Create (game = null) or edit a catalog entry. Only fields relevant to the launch type are sent; others are nulled. */
export function GameFormModal({
  open,
  game,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  game: GameDto | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (game: GameDto) => void;
}) {
  const { t, errText } = useI18n();
  const isEdit = !!game;
  const [name, setName] = useState('');
  const [launchType, setLaunchType] = useState<GameLaunchType>('STEAM');
  const [steamAppId, setSteamAppId] = useState('');
  const [exePath, setExePath] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [processNames, setProcessNames] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(game?.name ?? '');
    setLaunchType(game?.launchType ?? 'STEAM');
    setSteamAppId(game?.steamAppId ? String(game.steamAppId) : '');
    setExePath(game?.exePath ?? '');
    setArgs(game?.args ?? '');
    setUrl(game?.url ?? '');
    setProcessNames(game?.processNames.join(', ') ?? '');
    setImageUrl(game?.imageUrl ?? '');
    setIsActive(game?.isActive ?? true);
    setSortOrder(String(game?.sortOrder ?? nextSortOrder));
    setError(null);
  }, [open, game, nextSortOrder]);

  const appIdNumber = Number(steamAppId.trim());
  const appIdValid = /^\d+$/.test(steamAppId.trim()) && appIdNumber >= 1;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError(t('games.nameRequired'));
    if (launchType === 'STEAM' && !appIdValid) return setError(t('games.appIdInvalid'));
    if (launchType === 'EXE' && !exePath.trim()) return setError(t('games.exeRequired'));
    if (launchType === 'URL' && !url.trim()) return setError(t('games.urlRequired'));

    const body: GameInput = {
      name: name.trim(),
      launchType,
      steamAppId: launchType === 'STEAM' ? appIdNumber : null,
      exePath: launchType === 'EXE' ? exePath.trim() : null,
      args: launchType === 'EXE' && args.trim() ? args.trim() : null,
      url: launchType === 'URL' ? url.trim() : null,
      processNames: parseProcessNames(processNames),
      imageUrl: imageUrl.trim() || null,
      isActive,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
    };

    setBusy(true);
    setError(null);
    try {
      const saved = isEdit
        ? await api<GameDto>(`/games/${game.id}`, { method: 'PATCH', body })
        : await api<GameDto>('/games', { method: 'POST', body });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? t('games.editTitle') : t('games.createTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="game-form" loading={busy}>
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form id="game-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus />
        <Select label={t('games.launchType')} value={launchType} onChange={(e) => setLaunchType(e.target.value as GameLaunchType)}>
          {(['STEAM', 'EXE', 'URL'] as const).map((type) => (
            <option key={type} value={type}>
              {t(`games.type.${type}`)}
            </option>
          ))}
        </Select>

        {launchType === 'STEAM' && (
          <>
            <Input
              label={t('games.steamAppId')}
              inputMode="numeric"
              value={steamAppId}
              onChange={(e) => setSteamAppId(e.target.value)}
              hint={t('games.steamHint')}
              className="font-mono"
              required
            />
            <div className="flex items-start pt-6">
              <Button type="button" variant="secondary" disabled={!appIdValid} onClick={() => setImageUrl(steamCoverUrl(appIdNumber))}>
                🖼 {t('games.useSteamCover')}
              </Button>
            </div>
          </>
        )}

        {launchType === 'EXE' && (
          <>
            <div className="sm:col-span-2">
              <Input
                label={t('games.exePath')}
                value={exePath}
                onChange={(e) => setExePath(e.target.value)}
                placeholder="C:\Program Files\..."
                hint={t('games.exeHint')}
                className="font-mono"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label={`${t('games.args')} (${t('common.optional')})`}
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="--launch-product=league_of_legends --launch-patchline=live"
                className="font-mono"
              />
            </div>
          </>
        )}

        {launchType === 'URL' && (
          <div className="sm:col-span-2">
            <Input
              label={t('games.url')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              hint={t('games.urlHint')}
              className="font-mono"
              required
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Input
            label={t('games.processNames')}
            value={processNames}
            onChange={(e) => setProcessNames(e.target.value)}
            placeholder="cs2.exe, steam.exe"
            hint={t('games.processHint')}
            className="font-mono"
          />
        </div>

        <div className="flex gap-4 sm:col-span-2">
          <GameThumb name={name || '?'} imageUrl={imageUrl.trim() || null} className="h-[70px] w-[150px] shrink-0" />
          <div className="flex-1">
            <Input
              label={`${t('games.imageUrl')} (${t('common.optional')})`}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="font-mono"
            />
          </div>
        </div>

        <Input label={t('games.sortOrder')} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        <div className="flex items-end pb-2">
          <Checkbox label={t('games.isActive')} checked={isActive} onChange={setIsActive} />
        </div>

        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  );
}
