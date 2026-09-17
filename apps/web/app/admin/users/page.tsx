'use client';

import { formatDuration, formatGel, secondsToHours, type Paginated, type UserDto } from '@grm/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useToast } from '@/components/toast';
import { UserFormModal } from '@/components/user-form-modal';
import { Badge, Button, Card, ConfirmModal, Empty, Input, Loading, PageHeader, Pagination, Select, Table, Td, Th } from '@/components/ui';
import { api, withQuery } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { revalidate } from '@/lib/swr';

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserDto | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const key = withQuery('/users', { search: query, status, page, pageSize: PAGE_SIZE });
  const { data, isLoading } = useSWR<Paginated<UserDto>>(key);

  return (
    <>
      <PageHeader
        title={t('users.title')}
        actions={<Button onClick={() => setCreating(true)}>{t('users.new')}</Button>}
      />
      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px]">
          <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">{t('common.all')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </Select>
        </div>

        {isLoading || !data ? (
          <Loading />
        ) : data.items.length === 0 ? (
          <Empty />
        ) : (
          <Table minWidth={1040}>
            <thead>
              <tr>
                <Th>{t('common.username')}</Th>
                <Th>{t('common.email')}</Th>
                <Th>{t('common.name')}</Th>
                <Th>{t('common.phone')}</Th>
                <Th className="text-right">{t('common.balance')}</Th>
                <Th>{t('user.createdAt')}</Th>
                <Th>{t('common.status')}</Th>
                <Th className="text-right">{t('common.actions')}</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="cursor-pointer hover:bg-zinc-800/40" onClick={() => router.push(`/admin/users/${u.id}`)}>
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="font-medium text-white hover:text-violet-200" onClick={(e) => e.stopPropagation()}>
                      {u.username ?? u.name}
                    </Link>
                  </Td>
                  <Td className="text-zinc-400">{u.email}</Td>
                  <Td className="text-zinc-400">{u.name}</Td>
                  <Td className="tabular-nums text-zinc-400">{u.phone ?? '—'}</Td>
                  <Td className="text-right">
                    <div className="font-semibold tabular-nums text-white">{formatDuration(u.balanceSeconds, lang)}</div>
                    <div className="text-xs tabular-nums text-zinc-500">
                      {secondsToHours(u.balanceSeconds)} {lang === 'ka' ? 'სთ' : 'h'} · {formatGel(u.balanceSeconds)}
                    </div>
                  </Td>
                  <Td className="tabular-nums text-zinc-400">{formatDate(u.createdAt, lang)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? t('common.active') : t('common.inactive')}</Badge>
                      {u.activeSession && <Badge tone="violet">🎮 {u.activeSession.pc.name}</Badge>}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>
                        {t('common.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200" onClick={() => setDeleting(u)}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
      </Card>

      <UserFormModal
        open={creating || !!editing}
        user={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          toast.success(editing ? t('users.updated') : t('users.created'));
          void revalidate('/users');
        }}
      />

      <ConfirmModal
        open={!!deleting}
        title={t('users.deleteTitle')}
        message={t('users.deleteConfirm', { name: deleting?.name ?? '' })}
        confirmLabel={t('common.delete')}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await api(`/users/${deleting!.id}`, { method: 'DELETE' });
          toast.success(t('users.deleted'));
          await revalidate('/users');
        }}
      />
    </>
  );
}
