import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

// Create a test user and get token
async function getAuthToken() {
  const email = `progress-test-${Date.now()}@test.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'test123456' },
  });
  return res.json().token;
}

describe('Progress endpoints (require auth)', () => {
  it('GET /api/progress/dashboard returns empty stats for new user', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/dashboard',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalAnswered).toBe(0);
    expect(body.streak).toBe(0);
    expect(body.accuracy).toBe(0);
    expect(body.recentActivity).toHaveLength(0);
  });

  it('GET /api/progress/chapters returns chapter progress', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/chapters',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('nameIt');
    expect(body[0]).toHaveProperty('totalQuestions');
    expect(body[0]).toHaveProperty('percentage');
    expect(body[0].percentage).toBe(0); // new user
  });

  it('SM-2 updates after quiz submission with auth', async () => {
    const token = await getAuthToken();

    // Start quiz
    const startRes = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${token}` },
    });
    const { attemptId, questions } = startRes.json();

    // Answer all true
    const answers = questions.map((q: any) => ({
      questionId: q.id,
      answer: true,
    }));

    // Submit
    await app.inject({
      method: 'POST',
      url: '/api/quiz/submit',
      headers: { authorization: `Bearer ${token}` },
      payload: { attemptId, answers },
    });

    // Check dashboard updated
    const dashRes = await app.inject({
      method: 'GET',
      url: '/api/progress/dashboard',
      headers: { authorization: `Bearer ${token}` },
    });
    const dash = dashRes.json();
    expect(dash.totalAnswered).toBeGreaterThan(0);
    expect(dash.totalExams).toBe(1);
    expect(dash.recentActivity).toHaveLength(1);
  });

  it('GET /api/progress/review returns due questions', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/review',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/progress/dashboard',
    });
    expect(res.statusCode).toBe(401);
  });
});
