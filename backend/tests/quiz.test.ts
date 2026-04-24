import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq, sql } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';
import { accessCodes } from '../src/db/schema/access-codes.js';

const app = await buildApp();

const TEST_EMAIL = 'quiztest@qiada.app';
let authToken: string;

// Cleanup helper: delete user and all FK-dependent rows via raw SQL CASCADE
async function cleanupTestUser() {
  const existing = await app.db.select({ id: users.id }).from(users).where(eq(users.email, TEST_EMAIL));
  if (existing.length > 0) {
    const uid = existing[0].id;
    // Delete all FK-dependent tables
    await app.db.execute(sql`DELETE FROM user_question_stats WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_daily_activity WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM quiz_attempts WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM access_codes WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`);
    await app.db.delete(users).where(eq(users.email, TEST_EMAIL));
  }
}

// Setup: create user with active subscription
beforeAll(async () => {
  await cleanupTestUser();

  // Register
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: TEST_EMAIL, password: 'test123', name: 'Quiz Tester' },
  });
  const { token, user } = regRes.json();
  authToken = token;

  // Insert and activate an access code for this user
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  await app.db.insert(accessCodes).values({
    code: 'QUIZ-TEST-CODE',
    durationMinutes: 60 * 24 * 7,
    userId: user.id,
    isUsed: true,
    activatedAt: new Date(),
    expiresAt,
  });
});

afterAll(async () => {
  await cleanupTestUser();
  await app.close();
});

const authHeaders = () => ({ authorization: `Bearer ${authToken}` });

// --- Demo endpoint (no auth required) ---

describe('POST /api/quiz/demo', () => {
  it('returns 5 random questions without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quiz/demo' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.attemptId).toBeDefined();
    expect(body.timeLimitSeconds).toBeNull();
    expect(body.questions).toHaveLength(5);
    const q = body.questions[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('textIt');
    expect(q).toHaveProperty('textAr');
  });
});

// --- Exam endpoint (requires subscription) ---

describe('POST /api/quiz/exam', () => {
  it('rejects without auth', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quiz/exam' });
    expect(res.statusCode).toBe(401);
  });

  it('starts an exam with 30 questions (D.Lgs 59/2011 reform)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.attemptId).toBeDefined();
    expect(body.timeLimitSeconds).toBe(1200); // 20 min
    expect(body.questions).toHaveLength(30);
    // Each question has required fields but NOT isTrue (no cheating!)
    const q = body.questions[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('code');
    expect(q).toHaveProperty('textIt');
    expect(q).toHaveProperty('textAr');
    expect(q).not.toHaveProperty('isTrue');
  });
});

// --- Practice endpoint (requires subscription) ---

describe('POST /api/quiz/practice', () => {
  it('rejects without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it('starts practice with default 20 questions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.attemptId).toBeDefined();
    expect(body.timeLimitSeconds).toBeNull();
    expect(body.questions.length).toBeLessThanOrEqual(20);
  });

  it('filters by chapterId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { chapterId: 1, count: 5 },
    });
    const body = res.json();
    expect(body.questions.length).toBeLessThanOrEqual(5);
    for (const q of body.questions) {
      expect(q.chapterId).toBe(1);
    }
  });
});

// --- Submit endpoint (optional auth) ---

describe('POST /api/quiz/submit', () => {
  it('submits answers and gets result', async () => {
    // Start an exam (needs auth)
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();

    // Answer all true (some will be wrong, that's fine)
    const answers = qs.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });

    expect(submitRes.statusCode).toBe(200);
    const result = submitRes.json();
    expect(result.attemptId).toBe(attemptId);
    expect(result.totalQuestions).toBe(30);
    expect(result.correctCount).toBeGreaterThanOrEqual(0);
    expect(result.wrongCount).toBeGreaterThanOrEqual(0);
    expect(result.correctCount + result.wrongCount).toBe(30);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.passed).toBeDefined();
    expect(result.maxErrorsToPass).toBe(3);
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(result.details).toHaveLength(30);
    // Each detail has explanation
    expect(result.details[0]).toHaveProperty('explanationIt');
    expect(result.details[0]).toHaveProperty('explanationAr');
    expect(result.details[0]).toHaveProperty('isCorrect');
  });

  it('rejects double submission', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();

    const answers = qs.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    // First submit
    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });

    // Second submit — should fail
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });
    expect(res2.statusCode).toBe(409);
  });

  it('returns 404 for nonexistent attempt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId: 999999, answers: [] },
    });
    expect(res.statusCode).toBe(404);
  });
});

// --- Get result endpoint ---

describe('GET /api/quiz/:id', () => {
  it('returns attempt result after submission', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();

    const answers = qs.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });

    // Now requires auth (security fix)
    const noAuth = await app.inject({ method: 'GET', url: `/api/quiz/${attemptId}` });
    expect(noAuth.statusCode).toBe(401);

    const res = await app.inject({ method: 'GET', url: `/api/quiz/${attemptId}`, headers: authHeaders() });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(attemptId);
    expect(body.score).toBeDefined();
    expect(body.submittedAt).toBeDefined();
  });
});
