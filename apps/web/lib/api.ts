import type { ApiErrorBody } from '@grm/shared';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

/** Appends/overrides query params; empty values are dropped. Works on paths that already have a query. */
export function withQuery(path: string, query: Record<string, QueryValue>): string {
  const [base, existing] = path.split('?');
  const params = new URLSearchParams(existing);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Calls the API through the same-origin `/api` proxy. `path` is relative to `/api` (e.g. `/users?page=1`).
 * Throws ApiRequestError with the API's machine-readable `code` (or NETWORK when offline).
 */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? 'GET',
      headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK', 'Network error');
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiRequestError(
      res.status,
      body.code ?? (res.status >= 500 ? 'INTERNAL' : 'NETWORK'),
      body.message ?? res.statusText,
      body.details,
    );
  }
  return data as T;
}

/** SWR fetcher: the SWR key is the API path. */
export const swrFetcher = <T,>(key: string) => api<T>(key);
