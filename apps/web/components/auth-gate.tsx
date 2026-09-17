'use client';

import type { MeResponse } from '@grm/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { ApiRequestError, BASE_PATH } from '@/lib/api';

/**
 * Client-side role gate. Redirects to /login on 401 and to the other role's home on role mismatch.
 * `ready` is true only when the session belongs to `role`.
 */
export function useRequireRole(role: 'admin' | 'user') {
  const router = useRouter();
  const { data, error } = useSWR<MeResponse>('/auth/me');

  useEffect(() => {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      // router paths exclude the basePath; window.location includes it
      const path = window.location.pathname.slice(BASE_PATH.length) || '/';
      router.replace(`/login?next=${encodeURIComponent(path)}`);
    } else if (data && data.role !== role) {
      router.replace(data.role === 'admin' ? '/admin' : '/me');
    }
  }, [data, error, role, router]);

  return { me: data, ready: data?.role === role, error };
}
