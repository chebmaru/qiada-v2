import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/glossary', () => {
  it('returns all glossary terms', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/glossary' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBe(133);
    expect(body[0]).toHaveProperty('termIt');
    expect(body[0]).toHaveProperty('termAr');
  });

  it('terms have bilingual data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/glossary' });
    const body = res.json();
    const withAr = body.filter((t: any) => t.termAr && t.termAr.trim());
    expect(withAr.length).toBe(133);
  });
});
