'use client';

import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { cn } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

// ------------------------------------------------------------------ Button

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-500 disabled:bg-violet-600/50',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/50',
  warning: 'bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:bg-amber-500/50',
  ghost: 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm',
        variantClasses[variant],
        className,
      )}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ Form fields

export function Field({ label, error, hint, children }: { label?: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-zinc-500">{hint}</span>}
      {error && <span className="block text-xs text-red-400">{error}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60';

export function Input({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input {...props} className={cn(inputClass, className)} />
    </Field>
  );
}

export function Select({
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <Field label={label}>
      <select {...props} className={cn(inputClass, 'pr-8', className)}>
        {children}
      </select>
    </Field>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-violet-600"
      />
      {label}
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{message}</div>;
}

// ------------------------------------------------------------------ Layout bits

export function Card({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg shadow-black/20 backdrop-blur', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3">
          {title && <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'green' | 'violet' | 'red' | 'amber' }) {
  const tones = {
    default: 'text-white',
    green: 'text-emerald-400',
    violet: 'text-violet-300',
    red: 'text-red-400',
    amber: 'text-amber-300',
  };
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={cn('mt-1 text-2xl font-bold tabular-nums', tones[tone])}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

type BadgeTone = 'gray' | 'green' | 'red' | 'amber' | 'violet' | 'cyan';
const badgeTones: Record<BadgeTone, string> = {
  gray: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  red: 'bg-red-500/10 text-red-300 border-red-500/30',
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  violet: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
};

export function Badge({ tone = 'gray', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', online ? 'bg-emerald-400' : 'bg-zinc-600')} />
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin text-current', className ?? 'h-5 w-5')} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-zinc-400">
      <Spinner /> {t('common.loading')}
    </div>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return <div className="py-10 text-center text-sm text-zinc-500">{children ?? t('common.noData')}</div>;
}

// ------------------------------------------------------------------ Tables

export function Table({ children, className, minWidth = 640 }: { children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn('-mx-5 overflow-x-auto', className)}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('border-b border-zinc-800 px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn('border-b border-zinc-800/60 px-5 py-2.5 align-middle', className)}>
      {children}
    </td>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-400">
      <span>{t('common.pageOf', { page, pages, total })}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('common.prev')}
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Modals

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl', widths[size])}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="close">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const { t, errText } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
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
      onClose={busy ? () => undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant={tone} onClick={run} loading={busy}>
            {confirmLabel ?? t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-300">{message}</p>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

/** Two-to-four option segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-zinc-700 bg-zinc-950/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition',
            value === o.value ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
