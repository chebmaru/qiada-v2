import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

async function getAuthToken() {
  const email = `push-${Date.now()}@test.com`;
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'test123456' } });
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'test123456' } });
  return res.json().token;
}

async function getAdminToken() {
  const email = `pushadmin-${Date.now()}@test.com`;
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'admin123456' } });
  const { eq } = await import('drizzle-orm');
  const { users } = await import('../src/db/schema/users.js');
  await app.db.update(users).set({ role: 'admin' }).where(eq(users.email, email));
  const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password: 'admin123456' } });
  return res.json().token;
}

const fakeSub = {
  endpoint: `https://push.example.com/test-${Date.now()}`,
  keys: { p256dh: 'BNc6-test-p256dh-key-padding-base64', auth: 'auth-secret-base64' },
};

describe('GET /api/push/vapid-key', () => {
  it('returns VAPID public key without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/push/vapid-key' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('publicKey');
  });
});

describe('POST /api/push/subscribe', () => {
  it('requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      payload: { subscription: fakeSub },
    });
    expect(res.statusCode).toBe(401);
  });

  it('saves subscription with valid token', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { subscription: { ...fakeSub, endpoint: `https://push.example.com/sub-${Date.now()}` } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ created: true });
  });

  it('upserts same endpoint', async () => {
    const token = await getAuthToken();
    const endpoint = `https://push.example.com/upsert-${Date.now()}`;
    const sub = { ...fakeSub, endpoint };

    await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { subscription: sub },
    });

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { subscription: sub },
    });
    expect(res2.statusCode).toBe(201);
    expect(res2.json()).toMatchObject({ updated: true });
  });

  it('rejects invalid subscription', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { subscription: { endpoint: '' } },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /api/push/unsubscribe', () => {
  it('removes subscription', async () => {
    const token = await getAuthToken();
    const endpoint = `https://push.example.com/del-${Date.now()}`;

    await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { subscription: { ...fakeSub, endpoint } },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/push/unsubscribe',
      headers: { authorization: `Bearer ${token}` },
      payload: { endpoint },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ deleted: true });
  });
});

describe('POST /api/push/test', () => {
  it('requires admin role', async () => {
    const token = await getAuthToken();
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('sends test notification for admin', async () => {
    const token = await getAdminToken();
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/test',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('sent');
  });
});
