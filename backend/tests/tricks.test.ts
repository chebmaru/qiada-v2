import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

describe('GET /api/tricks', () => {
  it('returns paginated tricks', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tricks?limit=5' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(5);
    expect(body.total).toBe(231);
    expect(body.data[0]).toHaveProperty('topicKey');
    expect(body.data[0]).toHaveProperty('truePatternsIT');
  });
});

describe('GET /api/tricks/:topicKey', () => {
  it('returns tricks for known topic', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tricks/area_pedonale' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.topicKey).toBe('area_pedonale');
    expect(body.truePatternsIT).toBeTruthy();
    expect(body.truePatternsAR).toBeTruthy();
    expect(body.falsePatternsIT).toBeTruthy();
  });

  it('returns 404 for unknown topic', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tricks/nonexistent_topic_xyz' });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /api/keywords', () => {
  it('returns keyword hints', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/keywords' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.onlyTrue.length).toBeGreaterThan(0);
    expect(body.onlyFalse.length).toBeGreaterThan(0);
    expect(body.onlyTrue[0]).toHaveProperty('word');
    expect(body.onlyTrue[0]).toHaveProperty('count');
  });
});

describe('GET /api/confusing-pairs', () => {
  it('returns confusing pairs', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/confusing-pairs?limit=5' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(5);
    expect(body.total).toBe(1470);
    expect(body.data[0]).toHaveProperty('trueQuestion');
    expect(body.data[0]).toHaveProperty('falseQuestion');
  });

  it('filters by topicKey', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/confusing-pairs?topicKey=segnale_di_itinerario_extraurbano&limit=50',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const pair of body.data) {
      expect(pair.topicKey).toBe('segnale_di_itinerario_extraurbano');
    }
  });
});
