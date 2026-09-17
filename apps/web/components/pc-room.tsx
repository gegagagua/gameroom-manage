'use client';

import { formatClock, formatDuration, type GameDto, type PcCommand, type PcDto, type PcsResponse } from '@grm/shared';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { cn, formatTime, relativeTime } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { MessageKey } from '@/lib/messages';
import { REFRESH_MS, revalidate } from '@/lib/swr';
import { useOpenAlerts } from './alert-poller';
import { GameThumb } from './game-thumb';
import { useToast } from './toast';
import { Badge, Button, ConfirmModal, Empty, FormError, Input, Loading, Modal, Table, Td, Th } from './ui';

// ------------------------------------------------------------------ live data

export type StationState = 'offline' | 'free' | 'busy' | 'low' | 'critical';
export type RoomFilter = 'all' | 'busy' | 'free' | 'offline' | 'low';
type RoomView = 'grid' | 'table';

const CRITICAL_SECONDS = 60;
const VIEW_STORAGE_KEY = 'grm_pcs_view';

/** Re-renders every `ms` so countdowns tick locally between 30 s polls. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** PCs (polled), games (for covers) and the client↔server clock offset measured on each response. */
export function usePcRoomData() {
  const pcs = useSWR<PcsResponse>('/pcs', { refreshInterval: REFRESH_MS });
  const { data: games } = useSWR<GameDto[]>('/games', { revalidateOnFocus: false });
  const [sync, setSync] = useState<{ at: number; offsetMs: number } | null>(null);

  useEffect(() => {
    if (!pcs.data) return;
    const at = Date.now();
    setSync({ at, offsetMs: Date.parse(pcs.data.serverTime) - at });
  }, [pcs.data]);

  const gamesByName = useMemo(() => new Map((games ?? []).map((g) => [g.name.trim().toLowerCase(), g])), [games]);
  return { ...pcs, sync, gamesByName };
}

export interface LiveSession {
  remaining: number;
  elapsed: number;
  progress: number;
  level: 'busy' | 'low' | 'critical';
}

/**
 * Estimates the session between heartbeats: the API bills up to lastHeartbeatAt, so
 * remaining ≈ balance − (serverNow − lastHeartbeatAt), clamped at 0.
 */
export function liveSession(pc: PcDto, serverNow: number, lowThreshold: number): LiveSession | null {
  const s = pc.currentSession;
  if (!s) return null;
  const sinceHeartbeat = Math.max(0, (serverNow - Date.parse(s.lastHeartbeatAt)) / 1000);
  const remaining = Math.max(0, Math.floor(s.user.balanceSeconds - sinceHeartbeat));
  const total = s.user.balanceSeconds + s.consumedSeconds;
  return {
    remaining,
    elapsed: Math.max(0, Math.floor((serverNow - Date.parse(s.startedAt)) / 1000)),
    progress: total > 0 ? Math.min(1, remaining / total) : 0,
    level: remaining <= CRITICAL_SECONDS ? 'critical' : remaining <= lowThreshold ? 'low' : 'busy',
  };
}

const stateOf = (pc: PcDto, live: LiveSession | null): StationState => live?.level ?? (pc.online ? 'free' : 'offline');

const matchesFilter = (state: StationState, filter: RoomFilter) =>
  filter === 'all' ||
  (filter === 'busy' && (state === 'busy' || state === 'low' || state === 'critical')) ||
  (filter === 'low' && (state === 'low' || state === 'critical')) ||
  filter === state;

// ------------------------------------------------------------------ visual theme

const THEME: Record<
  StationState,
  { label: MessageKey; card: string; text: string; dot: string; icon: string; bar: string; number: string }
> = {
  offline: {
    label: 'dash.offline',
    card: 'border-zinc-800/80 bg-zinc-900/40',
    text: 'text-zinc-500',
    dot: 'bg-zinc-600',
    icon: 'text-zinc-700',
    bar: 'bg-zinc-600',
    number: 'text-zinc-600',
  },
  free: {
    label: 'dash.free',
    card: 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] via-zinc-900/70 to-zinc-900/80 shadow-[0_0_28px_-10px_rgba(16,185,129,0.5)] hover:border-emerald-400/50',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400 text-emerald-400',
    icon: 'text-emerald-400/80',
    bar: 'bg-emerald-500',
    number: 'text-white',
  },
  busy: {
    label: 'dash.busy',
    card: 'border-violet-500/50 bg-gradient-to-b from-violet-600/20 via-zinc-900/80 to-zinc-900/90 shadow-[0_0_36px_-10px_rgba(139,92,246,0.6)] hover:border-violet-400/70',
    text: 'text-violet-200',
    dot: 'bg-violet-400 text-violet-400',
    icon: 'text-violet-300',
    bar: 'bg-gradient-to-r from-violet-500 to-cyan-400',
    number: 'text-white',
  },
  low: {
    label: 'room.lowBalance',
    card: 'border-amber-500/60 bg-gradient-to-b from-amber-500/15 via-zinc-900/80 to-zinc-900/90 shadow-[0_0_36px_-10px_rgba(245,158,11,0.6)] hover:border-amber-400/80',
    text: 'text-amber-300',
    dot: 'bg-amber-400 text-amber-400',
    icon: 'text-amber-300',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-300',
    number: 'text-white',
  },
  critical: {
    label: 'room.critical',
    card: 'station-critical border-red-500/70 bg-gradient-to-b from-red-600/20 via-zinc-900/80 to-zinc-900/90',
    text: 'text-red-300',
    dot: 'bg-red-500 text-red-500',
    icon: 'text-red-400',
    bar: 'bg-gradient-to-r from-red-600 to-orange-400',
    number: 'text-white',
  },
};

const countdownTone: Record<LiveSession['level'], string> = {
  busy: 'text-white',
  low: 'text-amber-300',
  critical: 'text-red-400',
};

// ------------------------------------------------------------------ small pieces

function StationIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="26" height="17" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M7 18.5h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path d="M13 22l-1.5 4.5M19 22l1.5 4.5M9.5 27h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StatusPill({ state, pulse }: { state: StationState; pulse?: boolean }) {
  const { t } = useI18n();
  const th = THEME[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-current/20 bg-black/30 px-2 py-0.5 text-xs font-semibold', th.text)}>
      <span className="relative flex h-2 w-2">
        {pulse && <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', th.dot)} />}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]', th.dot)} />
      </span>
      {t(th.label)}
    </span>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-black/40', className ?? 'h-9 w-9')}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 32%))` }}
    >
      {initials || '?'}
    </span>
  );
}

function ProgressBar({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/90">
      <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', className)} style={{ width: `${Math.round(value * 1000) / 10}%` }} />
    </div>
  );
}

// ------------------------------------------------------------------ actions

interface PcActions {
  rename: (pc: PcDto) => void;
  command: (pc: PcDto, command: PcCommand) => void;
  cancel: (pc: PcDto) => void;
}

function RenameModal({ pc, onClose }: { pc: PcDto | null; onClose: () => void }) {
  const { t, errText } = useI18n();
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pc) {
      setName(pc.name);
      setError(null);
    }
  }, [pc]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pc || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/pcs/${pc.id}`, { method: 'PATCH', body: { name: name.trim() } });
      toast.success(t('pcs.renamed'));
      await revalidate('/pcs');
      onClose();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!pc}
      onClose={onClose}
      size="sm"
      title={t('room.renameTitle', { pc: pc ? `#${pc.number}` : '' })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="pc-rename" loading={busy}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="pc-rename" onSubmit={submit} className="space-y-3">
        <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={50} required autoFocus />
        <FormError message={error} />
      </form>
    </Modal>
  );
}

/** Action handlers + the modals they open. Render `modals` once per page. */
function usePcActions(): { actions: PcActions; modals: ReactNode } {
  const { t, errText } = useI18n();
  const toast = useToast();
  const [renaming, setRenaming] = useState<PcDto | null>(null);
  const [pending, setPending] = useState<{ pc: PcDto; command: PcCommand } | null>(null);

  const actions: PcActions = {
    rename: setRenaming,
    command: (pc, command) => setPending({ pc, command }),
    cancel: async (pc) => {
      try {
        await api(`/pcs/${pc.id}/command`, { method: 'DELETE' });
        toast.success(t('pcs.commandCancelled'));
        await revalidate('/pcs');
      } catch (err) {
        toast.error(errText(err));
      }
    },
  };

  const shutdown = pending?.command === 'SHUTDOWN';
  const modals = (
    <>
      <RenameModal pc={renaming} onClose={() => setRenaming(null)} />
      <ConfirmModal
        open={!!pending}
        title={shutdown ? `⏻ ${t('pcs.shutdown')}` : t('pcs.endSession')}
        message={pending ? t(shutdown ? 'pcs.confirmShutdown' : 'pcs.confirmLogout', { pc: pending.pc.name }) : ''}
        confirmLabel={shutdown ? t('pcs.shutdown') : t('pcs.endSession')}
        tone={shutdown ? 'danger' : 'warning'}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          await api(`/pcs/${pending!.pc.id}/command`, { method: 'POST', body: { command: pending!.command } });
          toast.success(t('pcs.commandSent'));
          await revalidate('/pcs', '/alerts', '/users');
        }}
      />
    </>
  );
  return { actions, modals };
}

function StationMenu({ pc, actions, openUp = false }: { pc: PcDto; actions: PcActions; openUp?: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = (label: ReactNode, onClick: () => void, opts: { disabled?: boolean; danger?: boolean } = {}) => (
    <button
      type="button"
      role="menuitem"
      disabled={opts.disabled}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40',
        opts.danger ? 'text-red-300 hover:bg-red-500/15' : 'text-zinc-200 hover:bg-zinc-800',
      )}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={t('common.actions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-lg text-lg leading-none text-zinc-400 transition hover:bg-white/10 hover:text-white',
          open && 'bg-white/10 text-white',
        )}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'animate-toast-in absolute right-0 z-30 w-56 rounded-xl border border-zinc-700 bg-zinc-900/95 p-1 text-left shadow-2xl backdrop-blur',
            openUp ? 'bottom-9' : 'top-9',
          )}
        >
          {item(<>✎ {t('room.rename')}</>, () => actions.rename(pc))}
          {item(<>⏏ {t('pcs.endSession')}</>, () => actions.command(pc, 'LOGOUT'), { disabled: !pc.currentSession })}
          {item(<>⏻ {t('pcs.shutdown')}</>, () => actions.command(pc, 'SHUTDOWN'), { disabled: !pc.online && !pc.currentSession, danger: true })}
          {pc.pendingCommand && (
            <>
              <div className="my-1 border-t border-zinc-800" />
              {item(<>✕ {t('pcs.cancelCommand')}</>, () => actions.cancel(pc))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ station card

function StationCard({
  pc,
  live,
  now,
  gamesByName,
  actions,
}: {
  pc: PcDto;
  live: LiveSession | null;
  now: number;
  gamesByName: Map<string, GameDto>;
  actions: PcActions;
}) {
  const { t, lang } = useI18n();
  const state = stateOf(pc, live);
  const th = THEME[state];
  const s = pc.currentSession;
  const game = s?.game ? gamesByName.get(s.game.trim().toLowerCase()) : undefined;

  return (
    // No overflow-hidden: the ⋯ menu must be able to extend past the card.
    <article className={cn('group relative flex min-h-[260px] flex-col rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 focus-within:z-20 hover:z-10', th.card)}>
      {/* faint top sheen */}
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <header className="flex items-start gap-3">
        <StationIcon className={cn('mt-1 h-8 w-8 shrink-0 transition-colors', th.icon)} />
        <div className="min-w-0 flex-1">
          <div className={cn('font-mono text-3xl font-black leading-none tabular-nums tracking-tight', th.number)}>
            {String(pc.number).padStart(2, '0')}
          </div>
          <div className="mt-1 truncate text-xs text-zinc-500">{pc.name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StationMenu pc={pc} actions={actions} />
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <StatusPill state={state} pulse={state !== 'offline'} />
        {s && !pc.online && <Badge tone="gray">📡 {t('room.stale')}</Badge>}
        {pc.pendingCommand && <Badge tone="amber">⏳ {t(`pcs.cmd.${pc.pendingCommand}`)}</Badge>}
      </div>

      {s && live ? (
        <div className="mt-4 flex flex-1 flex-col">
          <Link href={`/admin/users/${s.user.id}`} className="-mx-1 flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition hover:bg-white/5">
            <Avatar name={s.user.name} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{s.user.name}</div>
              <div className="truncate text-xs tabular-nums text-zinc-500">{s.user.phone}</div>
            </div>
          </Link>

          <div className="mt-3 flex min-h-8 items-center gap-2">
            {s.game ? (
              <>
                <GameThumb name={s.game} imageUrl={game?.imageUrl ?? null} className="h-8 w-[68px] shrink-0 rounded-md" />
                <span className="truncate text-xs font-medium text-zinc-200" title={s.game}>
                  🎮 {s.game}
                </span>
              </>
            ) : (
              <span className="text-xs text-zinc-500">{t('room.noGame')}</span>
            )}
          </div>

          <div className="mt-auto pt-3">
            <div className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">{t('room.remaining')}</div>
            <div className={cn('font-mono text-[1.9rem] font-black leading-tight tabular-nums', countdownTone[live.level])}>
              {formatClock(live.remaining)}
            </div>
            <ProgressBar value={live.progress} className={th.bar} />
            <div className="mt-2 flex items-center justify-between gap-2 text-xs tabular-nums text-zinc-400">
              <span>
                {t('room.started')} {formatTime(s.startedAt, lang)}
              </span>
              <span>
                {t('room.elapsed')} {formatDuration(live.elapsed, lang)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center">
            <StationIcon className={cn('h-12 w-12', state === 'free' ? 'text-emerald-400/30' : 'text-zinc-800')} />
            <div className={cn('text-xs', state === 'free' ? 'text-emerald-300/80' : 'text-zinc-600')}>
              {t(state === 'free' ? 'room.freeHint' : 'room.offlineHint')}
            </div>
          </div>
          <dl className="mt-auto space-y-0.5 border-t border-white/5 pt-2 text-xs text-zinc-500">
            <div className="flex justify-between gap-2">
              <dt>{t('dash.lastSeen')}</dt>
              <dd className="truncate text-zinc-400">{pc.lastSeenAt ? relativeTime(pc.lastSeenAt, lang, now) : t('common.never')}</dd>
            </div>
            {(pc.appVersion || pc.ipAddress) && (
              <div className="flex justify-between gap-2 font-mono text-zinc-600">
                <dt>{pc.appVersion ? `v${pc.appVersion}` : ''}</dt>
                <dd className="truncate">{pc.ipAddress ?? ''}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </article>
  );
}

// ------------------------------------------------------------------ table view

function StationTable({ rows, now, actions }: { rows: { pc: PcDto; live: LiveSession | null }[]; now: number; actions: PcActions }) {
  const { t, lang } = useI18n();
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
      <Table minWidth={860}>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>{t('common.status')}</Th>
            <Th>{t('pcs.current')}</Th>
            <Th className="text-right">{t('room.remaining')}</Th>
            <Th>{t('dash.lastSeen')}</Th>
            <Th>
              {t('pcs.ip')} / {t('pcs.version')}
            </Th>
            <Th className="text-right">{t('common.actions')}</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ pc, live }, index) => {
            const state = stateOf(pc, live);
            const s = pc.currentSession;
            return (
              <tr key={pc.id} className="transition hover:bg-zinc-800/30">
                <Td>
                  <div className="flex items-center gap-3">
                    <StationIcon className={cn('h-6 w-6', THEME[state].icon)} />
                    <div>
                      <div className="font-mono text-lg font-black tabular-nums text-white">{String(pc.number).padStart(2, '0')}</div>
                      <div className="text-xs text-zinc-500">{pc.name}</div>
                    </div>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap items-center gap-1">
                    <StatusPill state={state} />
                    {pc.pendingCommand && <Badge tone="amber">⏳ {t(`pcs.cmd.${pc.pendingCommand}`)}</Badge>}
                  </div>
                </Td>
                <Td>
                  {s ? (
                    <Link href={`/admin/users/${s.user.id}`} className="flex items-center gap-2 hover:text-violet-200">
                      <Avatar name={s.user.name} className="h-7 w-7 text-[11px]" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-white">{s.user.name}</div>
                        <div className="truncate text-xs text-zinc-500">{s.game ? `🎮 ${s.game}` : t('room.noGame')}</div>
                      </div>
                    </Link>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </Td>
                <Td className="text-right">
                  {live ? (
                    <span className={cn('font-mono text-base font-bold tabular-nums', countdownTone[live.level])}>{formatClock(live.remaining)}</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-zinc-400">{pc.lastSeenAt ? relativeTime(pc.lastSeenAt, lang, now) : t('common.never')}</Td>
                <Td className="font-mono text-xs text-zinc-500">
                  {pc.ipAddress ?? '—'}
                  {pc.appVersion && <div>v{pc.appVersion}</div>}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end">
                    {/* the table scrolls horizontally (clips vertically), so bottom rows open the menu upward */}
                    <StationMenu pc={pc} actions={actions} openUp={rows.length > 3 && index >= rows.length - 3} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

// ------------------------------------------------------------------ room (summary + toolbar + grid/table)

type TileTone = 'neutral' | 'green' | 'violet' | 'cyan' | 'amber' | 'red' | 'muted';

// Full class strings (Tailwind only generates classes it can find literally in source).
const TILE_TONES: Record<TileTone, { text: string; accent: string }> = {
  neutral: { text: 'text-zinc-100', accent: 'bg-zinc-400' },
  green: { text: 'text-emerald-400', accent: 'bg-emerald-400' },
  violet: { text: 'text-violet-300', accent: 'bg-violet-400' },
  cyan: { text: 'text-cyan-300', accent: 'bg-cyan-400' },
  amber: { text: 'text-amber-300', accent: 'bg-amber-400' },
  red: { text: 'text-red-400', accent: 'bg-red-500' },
  muted: { text: 'text-zinc-500', accent: 'bg-zinc-700' },
};

function SummaryTile({ label, value, tone, href }: { label: string; value: number; tone: TileTone; href?: string }) {
  const c = TILE_TONES[tone];
  const body = (
    <div className={cn('relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 transition hover:border-zinc-700', href && 'cursor-pointer')}>
      <div className={cn('absolute inset-y-0 left-0 w-1', c.accent)} />
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={cn('mt-0.5 font-mono text-3xl font-black tabular-nums', c.text)}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function PcRoom({ showSummary = false, allowTableView = false }: { showSummary?: boolean; allowTableView?: boolean }) {
  const { t, lang } = useI18n();
  const { data, isLoading, isValidating, mutate, sync, gamesByName } = usePcRoomData();
  const { data: alerts } = useOpenAlerts();
  const { actions, modals } = usePcActions();
  const now = useNow();
  const [filter, setFilter] = useState<RoomFilter>('all');
  const [view, setView] = useState<RoomView>('grid');

  useEffect(() => {
    if (!allowTableView) return;
    try {
      if (localStorage.getItem(VIEW_STORAGE_KEY) === 'table') setView('table');
    } catch {
      /* storage unavailable */
    }
  }, [allowTableView]);

  const changeView = (v: RoomView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  const serverNow = now + (sync?.offsetMs ?? 0);
  const rows = useMemo(
    () => (data?.items ?? []).map((pc) => ({ pc, live: liveSession(pc, serverNow, data?.lowBalanceThresholdSeconds ?? 300) })),
    [data, serverNow],
  );

  if (isLoading || !data) return <Loading />;

  const states = rows.map((r) => stateOf(r.pc, r.live));
  const count = (f: RoomFilter) => states.filter((s) => matchesFilter(s, f)).length;
  const visible = rows.filter((_, i) => matchesFilter(states[i]!, filter));
  const lowCount = count('low');
  const filters: { value: RoomFilter; label: string; dot: string }[] = [
    { value: 'all', label: t('common.all'), dot: 'bg-zinc-400' },
    { value: 'busy', label: t('dash.busy'), dot: 'bg-violet-400' },
    { value: 'free', label: t('dash.free'), dot: 'bg-emerald-400' },
    { value: 'offline', label: t('dash.offline'), dot: 'bg-zinc-600' },
    { value: 'low', label: t('room.lowBalance'), dot: 'bg-amber-400' },
  ];

  return (
    <div className="space-y-5">
      {showSummary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <SummaryTile label={t('dash.totalPcs')} value={data.summary.total} tone="neutral" />
          <SummaryTile label={t('dash.online')} value={data.summary.online} tone="green" />
          <SummaryTile label={t('dash.busy')} value={count('busy')} tone="violet" />
          <SummaryTile label={t('dash.free')} value={count('free')} tone="cyan" />
          <SummaryTile label={t('room.lowBalance')} value={lowCount} tone={lowCount ? 'amber' : 'muted'} />
          <SummaryTile
            label={t('dash.openAlerts')}
            value={alerts?.openCount ?? 0}
            tone={alerts?.openCount ? 'red' : 'muted'}
            href="/admin/alerts"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition',
                filter === f.value
                  ? 'border-violet-500/70 bg-violet-600/25 text-white shadow-[0_0_16px_-6px_rgba(139,92,246,0.8)]'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-white',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', f.dot)} />
              {f.label}
              <span className="rounded-full bg-black/40 px-1.5 font-mono tabular-nums text-zinc-300">{count(f.value)}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-zinc-500 sm:inline">
            {t('room.updates', { s: REFRESH_MS / 1000 })}
            {sync && (
              <>
                {' · '}
                {t('room.lastUpdate', { ago: relativeTime(new Date(sync.at).toISOString(), lang, now) })}
              </>
            )}
          </span>
          <button
            type="button"
            onClick={() => void mutate()}
            aria-label={t('room.refresh')}
            title={t('room.refresh')}
            className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className={cn('h-4 w-4', isValidating && 'animate-spin')} fill="none" aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {allowTableView && (
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
              {(['grid', 'table'] as RoomView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition', view === v ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white')}
                >
                  {v === 'grid' ? '▦ ' : '☰ '}
                  {t(v === 'grid' ? 'room.grid' : 'room.table')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800">
          <Empty>{t('room.emptyFilter')}</Empty>
        </div>
      ) : view === 'table' && allowTableView ? (
        <StationTable rows={visible} now={now} actions={actions} />
      ) : (
        <div className="room-floor grid grid-cols-2 gap-3 rounded-3xl sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map(({ pc, live }) => (
            <StationCard key={pc.id} pc={pc} live={live} now={now} gamesByName={gamesByName} actions={actions} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-zinc-600">{t('room.syncNote', { s: data.heartbeatIntervalSeconds })}</p>
      {modals}
    </div>
  );
}
