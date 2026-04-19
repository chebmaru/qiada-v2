import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/topics', () => {
  it('returns all topics', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBe(393);
  });

  it('filters by chapterId', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics?chapterId=1' });
    const body = res.json();
    expect(body.length).toBeGreaterThan(0);
    for (const t of body) {
      expect(t.chapterId).toBe(1);
    }
  });
});

describe('GET /api/topics/:topicKey', () => {
  it('returns topic by key', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics/dare_precedenza' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.topicKey).toBe('dare_precedenza');
    expect(body.titleIt).toBeDefined();
  });

  it('returns 404 for nonexistent topic', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics/zzz_nonexistent' });
    expect(res.statusCode).toBe(404);
  });
});
