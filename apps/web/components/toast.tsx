'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/format';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  /** ms; 0 = stays until dismissed */
  duration: number;
}

interface ToastApi {
  push: (toast: { kind: ToastKind; title: string; body?: string; duration?: number }) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const kindClasses: Record<ToastKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100',
  error: 'border-red-500/60 bg-red-950/95 text-red-100',
  warning: 'border-amber-500/60 bg-amber-950/95 text-amber-100',
  info: 'border-zinc-600 bg-zinc-900/95 text-zinc-100',
};

const kindIcon: Record<ToastKind, string> = { success: '✓', error: '⛔', warning: '⚠', info: 'ℹ' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback<ToastApi['push']>(
    ({ kind, title, body, duration }) => {
      const id = nextId.current++;
      const toast: Toast = { id, kind, title, body, duration: duration ?? (kind === 'error' ? 8000 : 4000) };
      setToasts((list) => [...list.slice(-5), toast]);
      if (toast.duration > 0) setTimeout(() => dismiss(id), toast.duration);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, body) => push({ kind: 'success', title, body }),
      error: (title, body) => push({ kind: 'error', title, body }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn('animate-toast-in pointer-events-auto flex gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur', kindClasses[t.kind])}
            role="status"
          >
            <span className="text-lg leading-none">{kindIcon[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="mt-0.5 text-sm opacity-90">{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="self-start text-xs opacity-60 hover:opacity-100" aria-label="dismiss">
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
