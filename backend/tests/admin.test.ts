import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

// Helper: create admin user and get token
async function getAdminToken() {
  const email = `admin-${Date.now()}@test.com`;
  // Register first (creates student role)
  const regRes = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'admin123456' },
  });
  const { token } = regRes.json();

  // Manually update role to admin via DB (no admin creation endpoint needed)
  const { eq } = await import('drizzle-orm');
  const { users } = await import('../src/db/schema/users.js');
  await app.db.update(users).set({ role: 'admin' }).where(eq(users.email, email));

  // Re-login to get updated token with admin role
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'admin123456' },
  });
  return loginRes.json().token;
}

async function getStudentToken() {
  const email = `student-${Date.now()}@test.com`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'student123' },
  });
  return res.json().token;
}

describe('Admin endpoints', () => {
  it('GET /api/admin/stats returns counts (admin only)', async () => {
    const token = await getAdminToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.questions).toBeGreaterThan(0);
    expect(body.topics).toBeGreaterThan(0);
    expect(body.chapters).toBeGreaterThan(0);
  });

  it('rejects non-admin users', async () => {
    const token = await getStudentToken();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/stats',
    });
    expect(res.statusCode).toBe(401);
  });

  it('CRUD question lifecycle', async () => {
    const token = await getAdminToken();

    // Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/admin/questions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        code: `TEST_${Date.now()}`,
        textIt: 'Test question IT',
        textAr: 'سؤال اختبار',
        isTrue: true,
        chapterId: 1,
        topicKey: 'dare_precedenza',
      },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json();
    expect(created.id).toBeDefined();

    // Update
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/admin/questions/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { textIt: 'Updated question IT' },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().textIt).toBe('Updated question IT');

    // Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/admin/questions/${created.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(deleteRes.statusCode).toBe(200);
  });
});
