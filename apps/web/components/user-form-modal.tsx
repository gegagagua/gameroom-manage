'use client';

import type { UserDto } from '@grm/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { parseHours } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { Button, Checkbox, FormError, Input, Modal } from './ui';

/** Create (user = null) or edit a customer. Balance is only set at creation; later changes go through the balance panel. */
export function UserFormModal({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user: UserDto | null;
  onClose: () => void;
  onSaved: (user: UserDto) => void;
}) {
  const { t, errText } = useI18n();
  const isEdit = !!user;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [balanceHours, setBalanceHours] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setPhone(user?.phone ?? '');
    setPassword('');
    setBalanceHours('');
    setIsActive(user?.isActive ?? true);
    setError(null);
  }, [open, user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!isEdit || password) && password.length < 6) return setError(`${t('common.password')}: ${t('password.min')}`);
    const hours = balanceHours.trim() ? parseHours(balanceHours) : 0;
    if (!isEdit && Number.isNaN(hours)) return setError(t('users.initialBalance'));

    setBusy(true);
    setError(null);
    try {
      const saved = isEdit
        ? await api<UserDto>(`/users/${user.id}`, {
            method: 'PATCH',
            body: { name, email, phone, isActive, ...(password ? { password } : {}) },
          })
        : await api<UserDto>('/users', {
            method: 'POST',
            body: { name, email, phone, password, isActive, ...(hours > 0 ? { balanceHours: hours } : {}) },
          });
      onSaved(saved);
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
      onClose={onClose}
      title={isEdit ? t('users.editTitle') : t('users.createTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="user-form" loading={busy}>
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label={t('common.name')} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus />
        </div>
        <Input label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label={t('common.phone')} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+995 5XX XX XX XX" required />
        <Input
          label={isEdit ? t('users.newPassword') : t('common.password')}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!isEdit}
          hint={t('password.min')}
        />
        {!isEdit && (
          <Input
            label={t('users.initialBalance')}
            inputMode="decimal"
            value={balanceHours}
            onChange={(e) => setBalanceHours(e.target.value)}
            placeholder="0"
          />
        )}
        <div className="flex items-end sm:col-span-2">
          <Checkbox label={t('users.isActive')} checked={isActive} onChange={setIsActive} />
        </div>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  );
}
