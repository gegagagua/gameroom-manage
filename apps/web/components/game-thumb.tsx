'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/format';

const GRADIENTS = [
  'from-violet-600 to-cyan-500',
  'from-rose-600 to-orange-400',
  'from-emerald-600 to-teal-400',
  'from-sky-600 to-indigo-500',
  'from-amber-500 to-red-600',
  'from-fuchsia-600 to-pink-400',
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

/** Game cover: the image when it loads, otherwise a deterministic gradient tile with initials. */
export function GameThumb({ name, imageUrl, className }: { name: string; imageUrl: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);

  const gradient = GRADIENTS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % GRADIENTS.length];
  return (
    <div className={cn('relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800', className)}>
      {imageUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-provided hosts
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className={cn('grid h-full w-full place-items-center bg-gradient-to-br text-sm font-black text-white', gradient)}>
          {initials(name)}
        </div>
      )}
    </div>
  );
}
