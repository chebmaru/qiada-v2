import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq, sql } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';
import { accessCodes } from '../src/db/schema/access-codes.js';

const app = await buildApp();

const SUFFIX = Date.now();
const EMAIL = `quiz-adv-${SUFFIX}@qiada.app`;
const PASSWORD = 'test123456';

let authToken: string;
let userId: number;

async function cleanupUser() {
  const existing = await app.db.select({ id: users.id }).from(users).where(eq(users.email, EMAIL));
  if (existing.length > 0) {
    const uid = existing[0].id;
    await app.db.execute(sql`DELETE FROM user_question_stats WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_daily_activity WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM quiz_attempts WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM access_codes WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`);
    await app.db.delete(users).where(eq(users.email, EMAIL));
  }
}

beforeAll(async () => {
  await cleanupUser();
  const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL, password: PASSWORD } });
  const data = regRes.json();
  authToken = data.token;
  userId = data.user.id;

  await app.db.insert(accessCodes).values({
    code: `QA-${SUFFIX}`,
    durationMinutes: 60 * 24 * 7,
    userId,
    isUsed: true,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
});

afterAll(async () => {
  await cleanupUser();
  await app.close();
});

const authHeaders = () => ({ authorization: `Bearer ${authToken}` });

// --- Quiz history ---

describe('Quiz history', () => {
  it('starts empty for new user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/quiz/history',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(0);
  });

  it('records after quiz submission', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });

    const histRes = await app.inject({
      method: 'GET',
      url: '/api/quiz/history',
      headers: authHeaders(),
    });
    expect(histRes.statusCode).toBe(200);
    const history = histRes.json();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]).toHaveProperty('mode', 'exam');
    expect(history[0]).toHaveProperty('score');
    expect(history[0]).toHaveProperty('submittedAt');
  });

  it('requires auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/quiz/history' });
    expect(res.statusCode).toBe(401);
  });
});

// --- Practice mode variations ---

describe('Practice mode', () => {
  it('filters by topicKey', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { topicKey: 'dare_precedenza', count: 5 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.questions.length).toBeLessThanOrEqual(5);
    expect(body.timeLimitSeconds).toBeNull();
  });

  it('respects count parameter', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { count: 10 },
    });
    expect(res.json().questions.length).toBeLessThanOrEqual(10);
  });

  it('rejects count > 100', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { count: 200 },
    });
    // Zod validation rejects count > 100
    expect(res.statusCode).toBe(400);
  });
});

// --- Submit with partial answers ---

describe('Submit edge cases', () => {
  it('handles partial answers (not all questions answered)', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();

    // Only answer first 10 questions
    const answers = qs.slice(0, 10).map((q: any) => ({ questionId: q.id, answer: true }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });
    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.totalQuestions).toBe(30);
    // Unanswered questions are counted as wrong
    expect(result.correctCount + result.wrongCount).toBe(30);
  });

  it('handles empty answers array', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId } = startRes.json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers: [] },
    });
    expect(res.statusCode).toBe(200);
    const result = res.json();
    expect(result.correctCount).toBe(0);
    expect(result.wrongCount).toBe(30);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('demo quiz submit works without auth', async () => {
    const startRes = await app.inject({ method: 'POST', url: '/api/quiz/demo' });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId, answers },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().totalQuestions).toBe(5);
  });
});

// --- SM-2 progress tracking ---

describe('SM-2 + Progress after quiz', () => {
  it('updates progress dashboard after submission', async () => {
    // Submit a practice quiz
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { count: 5 },
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });

    // Check dashboard stats updated
    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/progress/dashboard',
      headers: authHeaders(),
    });
    expect(dashRes.statusCode).toBe(200);
    const stats = dashRes.json();
    expect(stats.totalAnswered).toBeGreaterThan(0);
  });

  it('review questions endpoint works', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/review?limit=5',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('weak questions endpoint works', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/weak?limit=5',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('chapter progress shows data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/chapters',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('percentage');
  });

  it('topic stats show accuracy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/topics',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// --- Exam scoring rules ---

describe('Exam scoring (D.Lgs 59/2011)', () => {
  it('passes with <= 3 errors', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();

    // Get correct answers by brute force: we don't know them, so just check the scoring logic
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });
    const result = res.json();

    // Scoring should respect: passed = wrongCount <= 3
    if (result.wrongCount <= 3) {
      expect(result.passed).toBe(true);
    } else {
      expect(result.passed).toBe(false);
    }
    expect(result.maxErrorsToPass).toBe(3);
  });

  it('score is percentage of correct answers', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: authHeaders(),
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: false }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });
    const result = res.json();
    const expectedScore = Math.round((result.correctCount / 30) * 100);
    expect(result.score).toBe(expectedScore);
  });

  it('practice mode has no pass/fail', async () => {
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
      headers: authHeaders(),
      payload: { count: 5 },
    });
    const { attemptId, questions: qs } = startRes.json();
    const answers = qs.map((q: any) => ({ questionId: q.id, answer: true }));

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: authHeaders(),
      payload: { attemptId, answers },
    });
    expect(res.json().passed).toBeNull();
    expect(res.json().maxErrorsToPass).toBeNull();
  });
});
