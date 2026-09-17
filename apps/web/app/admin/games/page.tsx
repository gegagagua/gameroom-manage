'use client';

import type { GameDto } from '@grm/shared';
import { useState } from 'react';
import useSWR from 'swr';
import { GameFormModal } from '@/components/game-form-modal';
import { GameThumb } from '@/components/game-thumb';
import { useToast } from '@/components/toast';
import { Badge, Button, Card, ConfirmModal, Empty, Loading, PageHeader, Table, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { revalidate } from '@/lib/swr';

const typeTone = { STEAM: 'cyan', EXE: 'violet', URL: 'amber' } as const;

function targetText(g: GameDto) {
  if (g.launchType === 'STEAM') return `steam://rungameid/${g.steamAppId ?? '?'}`;
  if (g.launchType === 'EXE') return [g.exePath, g.args].filter(Boolean).join(' ');
  return g.url ?? '';
}

function ActiveToggle({ game }: { game: GameDto }) {
  const { t, errText } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await api<GameDto>(`/games/${game.id}`, { method: 'PATCH', body: { isActive: !game.isActive } });
      await revalidate('/games');
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={game.isActive}
      aria-label={t('games.isActive')}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition disabled:opacity-50',
        game.isActive ? 'border-emerald-500/60 bg-emerald-600/70' : 'border-zinc-600 bg-zinc-800',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition', game.isActive ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export default function GamesPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { data, isLoading } = useSWR<GameDto[]>('/games');
  const [editing, setEditing] = useState<GameDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<GameDto | null>(null);

  const nextSortOrder = data?.length ? Math.max(...data.map((g) => g.sortOrder)) + 10 : 10;

  return (
    <>
      <PageHeader title={t('games.title')} subtitle={t('games.subtitle')} actions={<Button onClick={() => setCreating(true)}>{t('games.new')}</Button>} />
      <Card>
        {isLoading || !data ? (
          <Loading />
        ) : data.length === 0 ? (
          <Empty />
        ) : (
          <Table minWidth={900}>
            <thead>
              <tr>
                <Th>{t('games.image')}</Th>
                <Th>{t('common.name')}</Th>
                <Th>{t('games.launchType')}</Th>
                <Th>{t('games.target')}</Th>
                <Th>{t('games.processNames')}</Th>
                <Th>{t('common.active')}</Th>
                <Th className="text-right">{t('games.sortOrder')}</Th>
                <Th className="text-right">{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.map((g) => (
                <tr key={g.id} className={cn('hover:bg-zinc-800/30', !g.isActive && 'opacity-60')}>
                  <Td>
                    <GameThumb name={g.name} imageUrl={g.imageUrl} className="h-[42px] w-[90px]" />
                  </Td>
                  <Td className="font-medium text-white">{g.name}</Td>
                  <Td>
                    <Badge tone={typeTone[g.launchType]}>{t(`games.type.${g.launchType}`)}</Badge>
                  </Td>
                  <Td className="max-w-[260px]">
                    <div className="truncate font-mono text-xs text-zinc-400" title={targetText(g)}>
                      {targetText(g) || '—'}
                    </div>
                  </Td>
                  <Td className="max-w-[220px]">
                    <div className="flex flex-wrap gap-1">
                      {g.processNames.length
                        ? g.processNames.map((p) => (
                            <span key={p} className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                              {p}
                            </span>
                          ))
                        : '—'}
                    </div>
                  </Td>
                  <Td>
                    <ActiveToggle game={g} />
                  </Td>
                  <Td className="text-right tabular-nums text-zinc-400">{g.sortOrder}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setEditing(g)}>
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200" onClick={() => setDeleting(g)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <GameFormModal
        open={creating || !!editing}
        game={editing}
        nextSortOrder={nextSortOrder}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          toast.success(editing ? t('games.updated') : t('games.created'));
          void revalidate('/games');
        }}
      />

      <ConfirmModal
        open={!!deleting}
        title={t('games.deleteTitle')}
        message={t('games.deleteConfirm', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await api(`/games/${deleting!.id}`, { method: 'DELETE' });
          toast.success(t('games.deleted'));
          await revalidate('/games');
        }}
      />
    </>
  );
}
