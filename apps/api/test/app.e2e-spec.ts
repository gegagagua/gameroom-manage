import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { MailService } from '../src/auth/mail.service';
import { ClockService } from '../src/common/clock.service';
import { PrismaService } from '../src/common/prisma.service';
import { BillingService } from '../src/sessions/billing.service';

class FakeClock {
  private t = new Date('2026-09-14T08:00:00.000Z').getTime();
  now() {
    return new Date(this.t);
  }
  advance(seconds: number) {
    this.t += seconds * 1000;
  }
}

class FakeMail {
  links: string[] = [];
  async sendPasswordReset(_to: string, _name: string, link: string) {
    this.links.push(link);
  }
}

const PC_KEY = 'test-pc-key';

describe('Game Room API (e2e)', () => {
  let app: INestApplication;
  let clock: FakeClock;
  let mail: FakeMail;
  let prisma: PrismaService;
  let billing: BillingService;
  let admin: ReturnType<typeof request.agent>;
  let http: () => ReturnType<typeof request>;

  const desktop = {
    heartbeat: (pcNumber: number, token?: string) => {
      const r = http().post('/api/desktop/heartbeat').set('x-pc-key', PC_KEY);
      if (token) r.set('Authorization', `Bearer ${token}`);
      return r.send({ pcNumber, appVersion: 'test' });
    },
    login: (pcNumber: number, login: string, password: string) =>
      http().post('/api/desktop/login').set('x-pc-key', PC_KEY).send({ pcNumber, login, password }),
    logout: (pcNumber: number, token: string, reason: 'USER' | 'EXPIRED' = 'USER') =>
      http()
        .post('/api/desktop/logout')
        .set('x-pc-key', PC_KEY)
        .set('Authorization', `Bearer ${token}`)
        .send({ pcNumber, reason }),
  };

  const createUser = async (overrides: Record<string, unknown> = {}) => {
    const n = Math.floor(Math.random() * 1e9);
    const res = await admin
      .post('/api/users')
      .send({ name: `User ${n}`, email: `u${n}@test.local`, phone: `+9955${n}`, password: 'secret1', balanceHours: 1, ...overrides })
      .expect(201);
    return res.body as { id: number; email: string; phone: string; username: string | null; balanceSeconds: number };
  };

  const balanceOf = async (userId: number) =>
    (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).balanceSeconds;

  beforeAll(async () => {
    clock = new FakeClock();
    mail = new FakeMail();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ClockService)
      .useValue(clock)
      .overrideProvider(MailService)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    billing = app.get(BillingService);
    http = () => request(app.getHttpServer());
    admin = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('rejects wrong admin credentials', async () => {
      const res = await http().post('/api/auth/admin/login').send({ email: 'admin@test.local', password: 'nope' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('logs in the predefined admin (cookie)', async () => {
      const res = await admin.post('/api/auth/admin/login').send({ email: 'admin@test.local', password: 'AdminPass1' });
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'][0]).toMatch(/grm_token=.*HttpOnly/);
      const me = await admin.get('/api/auth/me').expect(200);
      expect(me.body.role).toBe('admin');
    });

    it('requires auth for admin routes', async () => {
      const res = await http().get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('users CRUD', () => {
    it('creates a user with initial balance and a TOPUP transaction', async () => {
      const u = await createUser({ balanceHours: 1.5 });
      expect(u.balanceSeconds).toBe(5400);
      const tx = await admin.get(`/api/users/${u.id}/transactions`).expect(200);
      expect(tx.body.items).toHaveLength(1);
      expect(tx.body.items[0]).toMatchObject({ type: 'TOPUP', amountSeconds: 5400, balanceAfterSeconds: 5400 });
    });

    it('rejects duplicate email / phone and bad input', async () => {
      const u = await createUser();
      const dupEmail = await admin
        .post('/api/users')
        .send({ name: 'X', email: u.email.toUpperCase(), phone: '+995111222333', password: 'secret1' });
      expect(dupEmail.status).toBe(409);
      expect(dupEmail.body.code).toBe('EMAIL_TAKEN');
      const dupPhone = await admin
        .post('/api/users')
        .send({ name: 'X', email: 'new@test.local', phone: u.phone, password: 'secret1' });
      expect(dupPhone.body.code).toBe('PHONE_TAKEN');
      const bad = await admin.post('/api/users').send({ name: '', email: 'x', phone: 'abc', password: '1' });
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe('VALIDATION_FAILED');
    });

    it('imports-style user: optional phone, username login, username uniqueness', async () => {
      const n = Math.floor(Math.random() * 1e9);
      const u = await createUser({ username: `legacy${n}`, phone: null });
      expect(u.phone).toBeNull();
      expect(u.username).toBe(`legacy${n}`);

      // customers signing in with their (old) username, case-insensitively
      const customer = request.agent(app.getHttpServer());
      await customer.post('/api/auth/login').send({ login: `LEGACY${n}`, password: 'secret1' }).expect(200);

      const dupUsername = await admin
        .post('/api/users')
        .send({ name: 'X', username: u.username, email: `other${n}@test.local`, password: 'secret1' });
      expect(dupUsername.status).toBe(409);
      expect(dupUsername.body.code).toBe('USERNAME_TAKEN');

      // the username is freed by a soft delete
      await admin.delete(`/api/users/${u.id}`).expect(200);
      await admin
        .post('/api/users')
        .send({ name: 'X', username: u.username, email: `other${n}@test.local`, password: 'secret1' })
        .expect(201);
    });

    it('lists, searches, updates and soft-deletes', async () => {
      const u = await createUser({ name: 'Searchable Person' });
      const list = await admin.get('/api/users').query({ search: 'searchable' }).expect(200);
      expect(list.body.items.map((i: { id: number }) => i.id)).toContain(u.id);

      const upd = await admin.patch(`/api/users/${u.id}`).send({ name: 'Renamed' }).expect(200);
      expect(upd.body.name).toBe('Renamed');

      await admin.delete(`/api/users/${u.id}`).expect(200);
      await admin.get(`/api/users/${u.id}`).expect(404);
      // email is free again
      await createUser({ email: u.email });
    });
  });

  describe('balance management (admin only)', () => {
    it('adds, subtracts, sets and refuses to go below zero', async () => {
      const u = await createUser({ balanceHours: 1 });
      let res = await admin.post(`/api/users/${u.id}/balance`).send({ operation: 'add', hours: 2, note: 'cash' }).expect(200);
      expect(res.body.user.balanceSeconds).toBe(3 * 3600);
      res = await admin.post(`/api/users/${u.id}/balance`).send({ operation: 'subtract', hours: 0.5 }).expect(200);
      expect(res.body.user.balanceSeconds).toBe(2.5 * 3600);
      expect(res.body.transaction).toMatchObject({ type: 'DEDUCTION', amountSeconds: -1800 });
      res = await admin.post(`/api/users/${u.id}/balance`).send({ operation: 'subtract', hours: 10 });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
      res = await admin.post(`/api/users/${u.id}/balance`).send({ operation: 'set', hours: 1.2 }).expect(200);
      expect(res.body.user.balanceSeconds).toBe(4320);
    });

    it('is forbidden for customers', async () => {
      const u = await createUser();
      const customer = request.agent(app.getHttpServer());
      await customer.post('/api/auth/login').send({ login: u.phone, password: 'secret1' }).expect(200);
      await customer.post(`/api/users/${u.id}/balance`).send({ operation: 'add', hours: 5 }).expect(403);
      await customer.get('/api/users').expect(403);
      const me = await customer.get('/api/me').expect(200);
      expect(me.body.balanceSeconds).toBe(3600);
    });
  });

  describe('desktop billing', () => {
    it('requires the PC key', async () => {
      const res = await http().post('/api/desktop/heartbeat').send({ pcNumber: 1 });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_PC_KEY');
    });

    it('marks PCs online via heartbeat and shows who is on which PC', async () => {
      await desktop.heartbeat(1).expect(200);
      const u = await createUser({ name: 'Gamer One' });
      const login = await desktop.login(1, u.email, 'secret1').expect(200);
      expect(login.body.session.balanceSeconds).toBe(3600);

      const pcs = await admin.get('/api/pcs').expect(200);
      const pc1 = pcs.body.items.find((p: { number: number }) => p.number === 1);
      expect(pc1.online).toBe(true);
      expect(pc1.currentSession.user.name).toBe('Gamer One');
      const pc2 = pcs.body.items.find((p: { number: number }) => p.number === 2);
      expect(pc2.online).toBe(false);

      await desktop.logout(1, login.body.sessionToken).expect(200);
    });

    it('full lifecycle: charge per heartbeat → low balance alert → depleted alert → no login', async () => {
      const u = await createUser({ balanceHours: 1 });
      const { body } = await desktop.login(3, u.phone, 'secret1').expect(200);
      const token = body.sessionToken as string;

      // same user cannot log in on another PC
      const elsewhere = await desktop.login(4, u.phone, 'secret1');
      expect(elsewhere.status).toBe(409);
      expect(elsewhere.body.code).toBe('ALREADY_LOGGED_IN_ELSEWHERE');
      expect(elsewhere.body.details.pcNumber).toBe(3);

      clock.advance(65);
      let hb = await desktop.heartbeat(3, token).expect(200);
      expect(hb.body.session.balanceSeconds).toBe(3600 - 65);
      expect(await balanceOf(u.id)).toBe(3535);

      const tx = await admin.get(`/api/users/${u.id}/transactions`).expect(200);
      const charge = tx.body.items.find((t: { type: string }) => t.type === 'SESSION_CHARGE');
      expect(charge).toMatchObject({ amountSeconds: -65, balanceAfterSeconds: 3535 });

      clock.advance(3535 - 290);
      hb = await desktop.heartbeat(3, token).expect(200);
      expect(hb.body.session.balanceSeconds).toBe(290);
      let alerts = await admin.get('/api/alerts').query({ status: 'open' }).expect(200);
      expect(alerts.body.items.some((a: { type: string; user: { id: number } }) => a.type === 'LOW_BALANCE' && a.user.id === u.id)).toBe(true);

      clock.advance(400); // more than what is left
      hb = await desktop.heartbeat(3, token).expect(200);
      expect(hb.body.session).toMatchObject({ status: 'ENDED', endReason: 'BALANCE_DEPLETED', balanceSeconds: 0 });
      expect(await balanceOf(u.id)).toBe(0);

      alerts = await admin.get('/api/alerts').query({ status: 'open' }).expect(200);
      const depleted = alerts.body.items.find((a: { type: string; user: { id: number } }) => a.type === 'BALANCE_DEPLETED' && a.user.id === u.id);
      expect(depleted.pc.number).toBe(3);
      await admin.post(`/api/alerts/${depleted.id}/ack`).expect(200);

      const again = await desktop.login(3, u.phone, 'secret1');
      expect(again.status).toBe(403);
      expect(again.body.code).toBe('NO_BALANCE');

      const session = await prisma.session.findFirstOrThrow({ where: { userId: u.id } });
      expect(session.consumedSeconds).toBe(3600);
    });

    it('logout stops the countdown', async () => {
      const u = await createUser({ balanceHours: 2 });
      const { body } = await desktop.login(5, u.email, 'secret1').expect(200);
      clock.advance(30);
      const out = await desktop.logout(5, body.sessionToken).expect(200);
      expect(out.body.session).toMatchObject({ status: 'ENDED', endReason: 'LOGOUT', balanceSeconds: 7200 - 30 });
      clock.advance(600);
      const hb = await desktop.heartbeat(5, body.sessionToken).expect(200);
      expect(hb.body.session.balanceSeconds).toBe(7170);
      expect(await balanceOf(u.id)).toBe(7170);
    });

    it('EXPIRED logout consumes a small drift leftover and raises a depleted alert', async () => {
      const u = await createUser({ balanceHours: 0.01 }); // 36s
      const { body } = await desktop.login(6, u.email, 'secret1').expect(200);
      clock.advance(20); // client clock ran slightly fast
      const out = await desktop.logout(6, body.sessionToken, 'EXPIRED').expect(200);
      expect(out.body.session).toMatchObject({ endReason: 'BALANCE_DEPLETED', balanceSeconds: 0, consumedSeconds: 36 });
    });

    it('resumes the same session when the desktop app restarts', async () => {
      const u = await createUser({ balanceHours: 1 });
      const first = await desktop.login(7, u.email, 'secret1').expect(200);
      clock.advance(40);
      const second = await desktop.login(7, u.email, 'secret1').expect(200);
      expect(second.body.resumed).toBe(true);
      expect(second.body.session.id).toBe(first.body.session.id);
      expect(second.body.session.balanceSeconds).toBe(3560);
      await desktop.logout(7, second.body.sessionToken).expect(200);
    });

    it('closes stale sessions (no heartbeat) billing until the next expected heartbeat', async () => {
      const u = await createUser({ balanceHours: 1 });
      await desktop.login(8, u.email, 'secret1').expect(200);
      clock.advance(200);
      const closed = await billing.closeStaleSessions();
      expect(closed).toBeGreaterThanOrEqual(1);
      const s = await prisma.session.findFirstOrThrow({ where: { userId: u.id } });
      expect(s).toMatchObject({ status: 'ENDED', endReason: 'TIMEOUT', consumedSeconds: 60 });
      expect(await balanceOf(u.id)).toBe(3540);
    });

    it('admin SHUTDOWN command ends the session now and is delivered once', async () => {
      const u = await createUser({ balanceHours: 1 });
      const { body } = await desktop.login(9, u.email, 'secret1').expect(200);
      clock.advance(10);
      const pc9 = await prisma.pc.findUniqueOrThrow({ where: { number: 9 } });
      const cmd = await admin.post(`/api/pcs/${pc9.id}/command`).send({ command: 'SHUTDOWN' }).expect(200);
      expect(cmd.body.endedSessionId).toBe(body.session.id);

      clock.advance(50);
      const hb = await desktop.heartbeat(9, body.sessionToken).expect(200);
      expect(hb.body.command).toBe('SHUTDOWN');
      expect(hb.body.session).toMatchObject({ status: 'ENDED', endReason: 'ADMIN_FORCED', balanceSeconds: 3590 });
      const hb2 = await desktop.heartbeat(9).expect(200);
      expect(hb2.body.command).toBeNull();
    });

    it('cannot delete a user with an active session', async () => {
      const u = await createUser();
      const { body } = await desktop.login(10, u.email, 'secret1').expect(200);
      const del = await admin.delete(`/api/users/${u.id}`);
      expect(del.status).toBe(409);
      expect(del.body.code).toBe('USER_HAS_ACTIVE_SESSION');
      await desktop.logout(10, body.sessionToken).expect(200);
      await admin.delete(`/api/users/${u.id}`).expect(200);
    });
  });

  describe('password flows', () => {
    it('change password invalidates old tokens', async () => {
      const u = await createUser();
      const customer = request.agent(app.getHttpServer());
      const login = await customer.post('/api/auth/login').send({ login: u.email, password: 'secret1' }).expect(200);
      const oldToken = login.body.accessToken;
      const wrong = await customer.post('/api/auth/change-password').send({ currentPassword: 'bad', newPassword: 'newpass1' });
      expect(wrong.body.code).toBe('WRONG_CURRENT_PASSWORD');
      await customer.post('/api/auth/change-password').send({ currentPassword: 'secret1', newPassword: 'newpass1' }).expect(200);
      await customer.get('/api/me').expect(200); // cookie refreshed
      await http().get('/api/me').set('Authorization', `Bearer ${oldToken}`).expect(401);
      await http().post('/api/auth/login').send({ login: u.email, password: 'newpass1' }).expect(200);
    });

    it('forgot + reset password (token single-use)', async () => {
      const u = await createUser();
      await http().post('/api/auth/forgot-password').send({ email: 'nobody@test.local' }).expect(200);
      expect(mail.links).toHaveLength(0);
      await http().post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      const token = new URL(mail.links.at(-1)!).searchParams.get('token')!;
      await http().post('/api/auth/reset-password').send({ token, password: 'resetpw1' }).expect(200);
      const reuse = await http().post('/api/auth/reset-password').send({ token, password: 'another1' });
      expect(reuse.body.code).toBe('INVALID_RESET_TOKEN');
      await http().post('/api/auth/login').send({ login: u.email, password: 'resetpw1' }).expect(200);
    });
  });

  describe('reports', () => {
    it('summarizes a date range', async () => {
      const res = await admin.get('/api/reports/summary').query({ from: '2026-09-14', to: '2026-09-14' }).expect(200);
      expect(res.body.totals.sessions).toBeGreaterThanOrEqual(8);
      expect(res.body.totals.usageSeconds).toBeGreaterThan(3600);
      expect(res.body.totals.topupSeconds).toBeGreaterThan(0);
      expect(res.body.totals.depletedAlerts).toBeGreaterThanOrEqual(2);
      expect(res.body.byDay).toHaveLength(1);
      expect(res.body.byPc).toHaveLength(10);
      expect(res.body.byUser.length).toBeGreaterThan(0);

      const empty = await admin.get('/api/reports/summary').query({ from: '2026-01-01', to: '2026-01-03' }).expect(200);
      expect(empty.body.totals.sessions).toBe(0);
      expect(empty.body.byDay).toHaveLength(3);

      const sessions = await admin.get('/api/reports/sessions').query({ from: '2026-09-14', to: '2026-09-14' }).expect(200);
      expect(sessions.body.total).toBe(res.body.totals.sessions);

      const bad = await admin.get('/api/reports/summary').query({ from: '2026-09-15', to: '2026-09-14' });
      expect(bad.body.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('games', () => {
    type Game = { id: number; name: string; steamAppId: number | null; isActive: boolean; processNames: string[] };

    it('seeds default games and supports CRUD with launch validation', async () => {
      const list = await admin.get('/api/games').expect(200);
      expect(list.body.length).toBeGreaterThanOrEqual(5);
      expect(list.body.find((g: Game) => g.steamAppId === 730)?.name).toBe('Counter-Strike 2');

      const bad = await admin.post('/api/games').send({ name: 'X', launchType: 'STEAM' });
      expect(bad.status).toBe(400);
      expect(bad.body.code).toBe('GAME_LAUNCH_CONFIG_INVALID');

      const created = await admin
        .post('/api/games')
        .send({ name: 'Rocket League', launchType: 'STEAM', steamAppId: 252950, processNames: [' RocketLeague.exe ', '', 'RocketLeague.exe'] })
        .expect(201);
      expect(created.body.processNames).toEqual(['RocketLeague.exe']);

      const upd = await admin.patch(`/api/games/${created.body.id}`).send({ isActive: false }).expect(200);
      expect(upd.body.isActive).toBe(false);
      const switchBad = await admin.patch(`/api/games/${created.body.id}`).send({ launchType: 'EXE' });
      expect(switchBad.body.code).toBe('GAME_LAUNCH_CONFIG_INVALID');

      const customer = request.agent(app.getHttpServer());
      const u = await createUser();
      await customer.post('/api/auth/login').send({ login: u.email, password: 'secret1' }).expect(200);
      await customer.get('/api/games').expect(403);

      await admin.delete(`/api/games/${created.body.id}`).expect(200);
      const gone = await admin.delete(`/api/games/${created.body.id}`);
      expect(gone.body.code).toBe('GAME_NOT_FOUND');
    });

    it('desktop gets active games only while the session is active', async () => {
      const noToken = await http().get('/api/desktop/games').query({ pcNumber: 2 }).set('x-pc-key', PC_KEY);
      expect(noToken.status).toBe(401);
      expect(noToken.body.code).toBe('INVALID_SESSION_TOKEN');

      const hidden = await admin.post('/api/games').send({ name: 'Hidden', launchType: 'URL', url: 'x://y', isActive: false }).expect(201);
      const u = await createUser();
      const { body } = await desktop.login(2, u.email, 'secret1').expect(200);
      const games = await http()
        .get('/api/desktop/games')
        .query({ pcNumber: 2 })
        .set('x-pc-key', PC_KEY)
        .set('Authorization', `Bearer ${body.sessionToken}`)
        .expect(200);
      expect(games.body.items.length).toBeGreaterThan(0);
      expect(games.body.items.some((g: Game) => g.id === hidden.body.id)).toBe(false);
      expect('isActive' in games.body.items[0]).toBe(false);

      const wrongPc = await http()
        .get('/api/desktop/games')
        .query({ pcNumber: 3 })
        .set('x-pc-key', PC_KEY)
        .set('Authorization', `Bearer ${body.sessionToken}`);
      expect(wrongPc.status).toBe(401);

      // the running game is reported via the regular heartbeat and shown on the PC card
      await http()
        .post('/api/desktop/heartbeat')
        .set('x-pc-key', PC_KEY)
        .set('Authorization', `Bearer ${body.sessionToken}`)
        .send({ pcNumber: 2, currentGame: 'Counter-Strike 2' })
        .expect(200);
      const pc2 = async () =>
        (await admin.get('/api/pcs').expect(200)).body.items.find((p: { number: number }) => p.number === 2);
      expect((await pc2()).currentSession.game).toBe('Counter-Strike 2');

      await desktop.logout(2, body.sessionToken).expect(200);
      expect((await pc2()).currentSession).toBeNull();
      await http()
        .post('/api/desktop/heartbeat')
        .set('x-pc-key', PC_KEY)
        .send({ pcNumber: 2, currentGame: 'Dota 2' }) // no session → ignored
        .expect(200);
      expect((await prisma.pc.findUniqueOrThrow({ where: { number: 2 } })).currentGame).toBeNull();
      const after = await http()
        .get('/api/desktop/games')
        .query({ pcNumber: 2 })
        .set('x-pc-key', PC_KEY)
        .set('Authorization', `Bearer ${body.sessionToken}`);
      expect(after.status).toBe(401);
    });
  });
});
