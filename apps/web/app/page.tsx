'use client';

import type { MeResponse } from '@grm/shared';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { Loading } from '@/components/ui';

/** Entry point: send the visitor to their home based on the session role. */
export default function HomePage() {
  const router = useRouter();
  const { data, error } = useSWR<MeResponse>('/auth/me');

  useEffect(() => {
    if (data) router.replace(data.role === 'admin' ? '/admin' : '/me');
    else if (error) router.replace('/login');
  }, [data, error, router]);

  return <Loading />;
}
