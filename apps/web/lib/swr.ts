'use client';

import { mutate } from 'swr';

/** Revalidate every cached SWR key starting with one of the given API path prefixes. */
export function revalidate(...prefixes: string[]) {
  return mutate((key) => typeof key === 'string' && prefixes.some((p) => key.startsWith(p)));
}

/** Drop all cached data (on logout). */
export function clearCache() {
  return mutate(() => true, undefined, { revalidate: false });
}

export const REFRESH_MS = 30_000;
