import type { Admin, Alert, BalanceTransaction, Pc, Session, User } from '@prisma/client';

export type ActiveSessionRef = Session & { pc: Pc };

export function toUserDto(u: User, activeSession?: ActiveSessionRef | null) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    phone: u.phone,
    balanceSeconds: u.balanceSeconds,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    activeSession: activeSession
      ? {
          id: activeSession.id,
          startedAt: activeSession.startedAt,
          lastHeartbeatAt: activeSession.lastHeartbeatAt,
          consumedSeconds: activeSession.consumedSeconds,
          pc: { id: activeSession.pc.id, number: activeSession.pc.number, name: activeSession.pc.name },
        }
      : null,
  };
}

export function toTransactionDto(t: BalanceTransaction & { admin?: Admin | null; session?: (Session & { pc: Pc }) | null }) {
  return {
    id: t.id,
    type: t.type,
    amountSeconds: t.amountSeconds,
    balanceAfterSeconds: t.balanceAfterSeconds,
    note: t.note,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    admin: t.admin ? { id: t.admin.id, name: t.admin.name } : null,
    session: t.session
      ? {
          id: t.session.id,
          status: t.session.status,
          startedAt: t.session.startedAt,
          endedAt: t.session.endedAt,
          pc: { id: t.session.pc.id, number: t.session.pc.number, name: t.session.pc.name },
        }
      : null,
  };
}

export function toSessionDto(s: Session & { pc?: Pc; user?: User }) {
  return {
    id: s.id,
    status: s.status,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    endReason: s.endReason,
    lastHeartbeatAt: s.lastHeartbeatAt,
    consumedSeconds: s.consumedSeconds,
    pc: s.pc ? { id: s.pc.id, number: s.pc.number, name: s.pc.name } : undefined,
    user: s.user ? { id: s.user.id, name: s.user.name } : undefined,
  };
}

export function toAlertDto(a: Alert & { user: User; pc: Pc | null; acknowledgedBy?: Admin | null }) {
  return {
    id: a.id,
    type: a.type,
    message: a.message,
    createdAt: a.createdAt,
    acknowledgedAt: a.acknowledgedAt,
    acknowledgedBy: a.acknowledgedBy ? { id: a.acknowledgedBy.id, name: a.acknowledgedBy.name } : null,
    sessionId: a.sessionId,
    user: { id: a.user.id, name: a.user.name, phone: a.user.phone },
    pc: a.pc ? { id: a.pc.id, number: a.pc.number, name: a.pc.name } : null,
  };
}
