import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';

const app = await buildApp();

const SUFFIX = Date.now();
const EMAIL_ADMIN = `admin-codes-${SUFFIX}@qiada.app`;
const EMAIL_STUDENT = `student-codes-${SUFFIX}@qiada.app`;
const PASSWORD = 'test123456';

let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  // Create admin
  const regA = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL_ADMIN, password: PASSWORD } });
  await app.db.update(users).set({ role: 'admin' }).where(eq(users.email, EMAIL_ADMIN));
  const loginA = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: EMAIL_ADMIN, password: PASSWORD } });
  adminToken = loginA.json().token;

  // Create student
  const regS = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: EMAIL_STUDENT, password: PASSWORD } });
  studentToken = regS.json().token;
});

afterAll(async () => {
  await app.db.delete(users).where(eq(users.email, EMAIL_ADMIN));
  await app.db.delete(users).where(eq(users.email, EMAIL_STUDENT));
  await app.close();
});

describe('Admin Codes CRUD', () => {
  let createdCodeIds: number[] = [];

  it('generates batch of access codes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/codes',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { count: 3, durationMinutes: 60 },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveLength(3);
    for (const code of body) {
      expect(code.code).toMatch(/^QIA-/);
      expect(code.durationMinutes).toBe(60);
      expect(code.isUsed).toBe(false);
      createdCodeIds.push(code.id);
    }
  });

  it('lists all codes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/codes',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(3);
  });

  it('extends a code duration', async () => {
    const id = createdCodeIds[0];
    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/codes/${id}/extend`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { addMinutes: 120 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.durationMinutes).toBe(180); // 60 + 120
  });

  it('revokes a code', async () => {
    const id = createdCodeIds[1];
    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/codes/${id}/revoke`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.isUsed).toBe(true);
  });

  it('deletes a code', async () => {
    const id = createdCodeIds[2];
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/admin/codes/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('student cannot generate codes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/codes',
      headers: { authorization: `Bearer ${studentToken}` },
      payload: { count: 1, durationMinutes: 60 },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Admin Users', () => {
  it('lists all users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(2);
    expect(body[0]).toHaveProperty('email');
    expect(body[0]).toHaveProperty('role');
    expect(body[0]).toHaveProperty('isActive');
  });

  it('changes user role', async () => {
    // Get student user ID
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const student = listRes.json().find((u: any) => u.email === EMAIL_STUDENT);
    expect(student).toBeDefined();

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${student.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'admin' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe('admin');

    // Restore to student
    await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${student.id}/role`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { role: 'student' },
    });
  });

  it('toggles user active status', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const student = listRes.json().find((u: any) => u.email === EMAIL_STUDENT);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${student.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isActive).toBe(false);

    // Restore
    await app.inject({
      method: 'PUT',
      url: `/api/admin/users/${student.id}/toggle`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
  });

  it('student cannot list users', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      headers: { authorization: `Bearer ${studentToken}` },
    });
    expect(res.statusCode).toBe(403);
  });
});
