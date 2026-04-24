import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/questions', () => {
  it('returns paginated questions (default 40)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(40);
    expect(body.total).toBe(6845);
    expect(body.limit).toBe(40);
    expect(body.offset).toBe(0);
  });

  it('filters by chapterId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?chapterId=1' });
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const q of body.data) {
      expect(q.chapterId).toBe(1);
    }
  });

  it('filters by topicKey', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?topicKey=dare_precedenza' });
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const q of body.data) {
      expect(q.topicKey).toBe('dare_precedenza');
    }
  });

  it('limits to max 100', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=200' });
    const body = res.json();
    expect(body.data.length).toBeLessThanOrEqual(100);
    expect(body.limit).toBe(100);
  });
});

describe('GET /api/questions/random', () => {
  it('returns N random questions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/random?n=10' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(10);
    expect(body[0]).toHaveProperty('code');
    expect(body[0]).toHaveProperty('textIt');
    expect(body[0]).toHaveProperty('textAr');
    // isTrue must NOT be exposed publicly (security fix)
    expect(body[0]).not.toHaveProperty('isTrue');
  });
});

describe('GET /api/questions/:code', () => {
  it('returns question by ministerial code', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/B18315' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.code).toBe('B18315');
    expect(body.textIt).toBeDefined();
    expect(body.textAr).toBeDefined();
  });

  it('returns 404 for nonexistent code', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/ZZZZZ' });
    expect(res.statusCode).toBe(404);
  });
});
