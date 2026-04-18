import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('POST /api/quiz/exam', () => {
  it('starts an exam with 40 questions', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/quiz/exam' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.attemptId).toBeDefined();
    expect(body.timeLimitSeconds).toBe(1800); // 30 min
    expect(body.questions).toHaveLength(40);
    // Each question has required fields but NOT isTrue (no cheating!)
    const q = body.questions[0];
    expect(q).toHaveProperty('id');
    expect(q).toHaveProperty('code');
    expect(q).toHaveProperty('textIt');
    expect(q).toHaveProperty('textAr');
    expect(q).not.toHaveProperty('isTrue');
  });
});

describe('POST /api/quiz/practice', () => {
  it('starts practice with default 20 questions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/practice',
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
      payload: { chapterId: 1, count: 5 },
    });
    const body = res.json();
    expect(body.questions.length).toBeLessThanOrEqual(5);
    for (const q of body.questions) {
      expect(q.chapterId).toBe(1);
    }
  });
});

describe('POST /api/quiz/submit', () => {
  it('submits answers and gets result', async () => {
    // Start an exam
    const startRes = await app.inject({ method: 'POST', url: '/api/quiz/exam' });
    const { attemptId, questions } = startRes.json();

    // Answer all true (some will be wrong, that's fine)
    const answers = questions.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId, answers },
    });

    expect(submitRes.statusCode).toBe(200);
    const result = submitRes.json();
    expect(result.attemptId).toBe(attemptId);
    expect(result.totalQuestions).toBe(40);
    expect(result.correctCount).toBeGreaterThanOrEqual(0);
    expect(result.wrongCount).toBeGreaterThanOrEqual(0);
    expect(result.correctCount + result.wrongCount).toBe(40);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.passed).toBeDefined();
    expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    expect(result.details).toHaveLength(40);
    // Each detail has explanation
    expect(result.details[0]).toHaveProperty('explanationIt');
    expect(result.details[0]).toHaveProperty('explanationAr');
    expect(result.details[0]).toHaveProperty('isCorrect');
  });

  it('rejects double submission', async () => {
    const startRes = await app.inject({ method: 'POST', url: '/api/quiz/exam' });
    const { attemptId, questions } = startRes.json();

    const answers = questions.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    // First submit
    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId, answers },
    });

    // Second submit — should fail
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
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

describe('GET /api/quiz/:id', () => {
  it('returns attempt result after submission', async () => {
    const startRes = await app.inject({ method: 'POST', url: '/api/quiz/exam' });
    const { attemptId, questions } = startRes.json();

    const answers = questions.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      payload: { attemptId, answers },
    });

    const res = await app.inject({ method: 'GET', url: `/api/quiz/${attemptId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(attemptId);
    expect(body.score).toBeDefined();
    expect(body.submittedAt).toBeDefined();
  });
});
