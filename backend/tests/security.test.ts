import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq, sql } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';
import { accessCodes } from '../src/db/schema/access-codes.js';

const app = await buildApp();

const SUFFIX = Date.now();
const EMAIL_A = `sec-userA-${SUFFIX}@qiada.app`;
const EMAIL_B = `sec-userB-${SUFFIX}@qiada.app`;
const EMAIL_DISABLED = `sec-disabled-${SUFFIX}@qiada.app`;
const PASSWORD = 'test123456';

let tokenA: string;
let userIdA: number;
let tokenB: string;
let userIdB: number;
let tokenDisabled: string;
let userIdDisabled: number;

async function cleanupUser(email: string) {
  const existing = await app.db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    const uid = existing[0].id;
    await app.db.execute(sql`DELETE FROM user_question_stats WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_daily_activity WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM quiz_attempts WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM access_codes WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`);
    await app.db.delete(users).where(eq(users.email, email));
  }
}

beforeAll(async () => {
  for (const email of [EMAIL_A, EMAIL_B, EMAIL_DISABLED]) {
    await cleanupUser(email);
  }

  // User A with subscription
  const regA = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL_A, password: PASSWORD } });
  const dataA = regA.json();
  tokenA = dataA.token;
  userIdA = dataA.user.id;
  await app.db.insert(accessCodes).values({
    code: `SEC-A-${SUFFIX}`,
    durationMinutes: 60 * 24 * 7,
    userId: userIdA,
    isUsed: true,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // User B with subscription
  const regB = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL_B, password: PASSWORD } });
  const dataB = regB.json();
  tokenB = dataB.token;
  userIdB = dataB.user.id;
  await app.db.insert(accessCodes).values({
    code: `SEC-B-${SUFFIX}`,
    durationMinutes: 60 * 24 * 7,
    userId: userIdB,
    isUsed: true,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Disabled user
  const regD = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL_DISABLED, password: PASSWORD } });
  const dataD = regD.json();
  tokenDisabled = dataD.token;
  userIdDisabled = dataD.user.id;
  await app.db.update(users).set({ isActive: false }).where(eq(users.id, userIdDisabled));
});

afterAll(async () => {
  for (const email of [EMAIL_A, EMAIL_B, EMAIL_DISABLED]) {
    await cleanupUser(email);
  }
  await app.close();
});

// --- Questions endpoint: never expose answers ---

describe('Security: questions never expose isTrue', () => {
  it('GET /api/questions does not include isTrue or explanations', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=5' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const q of body.data) {
      expect(q).not.toHaveProperty('isTrue');
      expect(q).not.toHaveProperty('explanationIt');
      expect(q).not.toHaveProperty('explanationAr');
    }
  });

  it('GET /api/questions/random does not include isTrue', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/random?n=3' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const q of body) {
      expect(q).not.toHaveProperty('isTrue');
      expect(q).not.toHaveProperty('explanationIt');
      expect(q).not.toHaveProperty('explanationAr');
    }
  });

  it('GET /api/questions/:code does not include isTrue', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/B18315' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).not.toHaveProperty('isTrue');
    expect(body).not.toHaveProperty('explanationIt');
  });
});

// --- Quiz: ownership check ---

describe('Security: quiz ownership', () => {
  it('user B cannot view user A quiz result', async () => {
    // User A starts and submits an exam
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { attemptId, answers },
    });

    // User B tries to view
    const res = await app.inject({
      method: 'GET',
      url: `/api/quiz/${attemptId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('user A can view own quiz result', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: false }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { attemptId, answers },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/quiz/${attemptId}`,
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it('quiz start does not expose isTrue in exam questions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    const body = res.json();
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('isTrue');
      expect(q).not.toHaveProperty('explanationIt');
      expect(q).not.toHaveProperty('explanationAr');
    }
  });

  it('practice start does not expose isTrue', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { count: 5 },
    });
    const body = res.json();
    for (const q of body.questions) {
      expect(q).not.toHaveProperty('isTrue');
      expect(q).not.toHaveProperty('explanationIt');
    }
  });
});

// --- Disabled user cannot refresh token ---

describe('Security: disabled user', () => {
  it('disabled user cannot login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: EMAIL_DISABLED, password: PASSWORD },
    });
    expect(res.statusCode).toBe(401);
  });

  it('disabled user cannot refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { authorization: `Bearer ${tokenDisabled}` },
    });
    expect(res.statusCode).toBe(401);
  });
});

// --- Access code race condition ---

describe('Security: access code atomic activation', () => {
  it('same code cannot be activated twice', async () => {
    // Insert a fresh code
    const code = `RACE-${SUFFIX}`;
    await app.db.insert(accessCodes).values({
      code,
      durationMinutes: 60,
      isUsed: false,
    });

    // Both users try to activate simultaneously
    const [res1, res2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/auth/activate',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { code },
      }),
      app.inject({
        method: 'POST',
        url: '/api/auth/activate',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { code },
      }),
    ]);

    // One succeeds, one fails
    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });
});

// --- Input validation ---

describe('Security: input validation', () => {
  it('register rejects short password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'x@y.com', password: '123' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('register rejects invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'notanemail', password: 'test123456' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('quiz submit rejects invalid payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId: 'abc', answers: 'not-array' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('questions pagination respects max 100 limit', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=500' });
    const body = res.json();
    expect(body.data.length).toBeLessThanOrEqual(100);
  });

  it('questions random respects max 100', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/random?n=500' });
    const body = res.json();
    expect(body.length).toBeLessThanOrEqual(100);
  });
});

// --- Admin endpoints require admin role ---

describe('Security: admin authorization', () => {
  it('student cannot access admin codes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/codes',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('student cannot access admin users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('unauthenticated cannot access admin stats', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/admin/stats' });
    expect(res.statusCode).toBe(401);
  });
});
