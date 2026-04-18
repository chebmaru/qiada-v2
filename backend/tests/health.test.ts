import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe(true);
    expect(body.timestamp).toBeDefined();
  });
});
