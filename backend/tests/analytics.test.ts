import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';

const app = await buildApp();
afterAll(() => app.close());

const SUFFIX = Date.now();
const ADMIN_EMAIL = `analytics-admin-${SUFFIX}@qiada.app`;
let adminToken: string;

beforeAll(async () => {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: ADMIN_EMAIL, password: 'test123456' } });
  await app.db.update(users).set({ role: 'admin' }).where(eq(users.email, ADMIN_EMAIL));
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: ADMIN_EMAIL, password: 'test123456' } });
  adminToken = login.json().token;
});

describe('Analytics endpoints', () => {
  it('POST /api/analytics/pageview returns 204', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/pageview',
      payload: { path: '/it/quiz', referrer: 'https://google.com' },
    });
    expect(res.statusCode).toBe(204);
  });

  it('POST /api/analytics/event returns 204', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/event',
      payload: { event: 'quiz_start', path: '/it/quiz/exam', metadata: { mode: 'demo' } },
    });
    expect(res.statusCode).toBe(204);
  });

  it('POST /api/analytics/pageview handles malformed body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/pageview',
      payload: 'not-json',
      headers: { 'content-type': 'text/plain' },
    });
    expect(res.statusCode).toBe(204);
  });

  it('GET /api/analytics/summary requires admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/summary',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/analytics/summary returns pageview data for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/summary',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('totalPageviews');
    expect(body).toHaveProperty('topPages');
  });

  it('GET /api/analytics/dashboard requires admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/dashboard',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/analytics/user/999 requires admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/user/999',
    });
    expect(res.statusCode).toBe(401);
  });
});
