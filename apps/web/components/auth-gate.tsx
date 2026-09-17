'use client';

import type { MeResponse } from '@grm/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { ApiRequestError } from '@/lib/api';

/**
 * Client-side role gate. Redirects to /login on 401 and to the other role's home on role mismatch.
 * `ready` is true only when the session belongs to `role`.
 */
export function useRequireRole(role: 'admin' | 'user') {
  const router = useRouter();
  const { data, error } = useSWR<MeResponse>('/auth/me');

  useEffect(() => {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    } else if (data && data.role !== role) {
      router.replace(data.role === 'admin' ? '/admin' : '/me');
    }
  }, [data, error, role, router]);

  return { me: data, ready: data?.role === role, error };
}
