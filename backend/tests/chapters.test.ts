import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/chapters', () => {
  it('returns 30 chapters', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chapters' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(30);
    expect(body[0]).toHaveProperty('nameIt');
    expect(body[0]).toHaveProperty('nameAr');
    expect(body[0]).toHaveProperty('number');
    expect(body[0]).toHaveProperty('questionCount');
  });

  it('chapters are ordered by number', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chapters' });
    const body = res.json();
    for (let i = 1; i < body.length; i++) {
      expect(body[i].number).toBeGreaterThan(body[i - 1].number);
    }
  });

  it('returns 404 for nonexistent chapter', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chapters/999' });
    expect(res.statusCode).toBe(404);
  });
});
