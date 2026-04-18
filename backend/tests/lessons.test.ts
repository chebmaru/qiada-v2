import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/lessons', () => {
  it('returns all lessons', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/lessons' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('titleIt');
    expect(body[0]).toHaveProperty('titleAr');
    expect(body[0]).toHaveProperty('chapterId');
  });

  it('filters by chapterId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/lessons?chapterId=1' });
    const body = res.json();
    expect(body.length).toBeGreaterThan(0);
    for (const l of body) {
      expect(l.chapterId).toBe(1);
    }
  });
});
