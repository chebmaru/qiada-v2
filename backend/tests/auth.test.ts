import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';
import { accessCodes } from '../src/db/schema/access-codes.js';
import { generateAccessCode } from '../src/services/auth.js';

const app = await buildApp();

// Cleanup test users before/after
beforeAll(async () => {
  await app.db.delete(accessCodes).where(eq(accessCodes.code, 'TEST-CODE-1234'));
  await app.db.delete(users).where(eq(users.email, 'test@qiada.app'));
  await app.db.delete(users).where(eq(users.email, 'test2@qiada.app'));
});

afterAll(async () => {
  await app.db.delete(accessCodes).where(eq(accessCodes.code, 'TEST-CODE-1234'));
  await app.db.delete(users).where(eq(users.email, 'test@qiada.app'));
  await app.db.delete(users).where(eq(users.email, 'test2@qiada.app'));
  await app.close();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@qiada.app', password: 'test123', name: 'Test User' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('test@qiada.app');
    expect(body.user.role).toBe('student');
  });

  it('rejects duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@qiada.app', password: 'test123' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('rejects invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-email', password: 'test123' },
    });
    expect(res.statusCode).toBe(400); // Zod validation error
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@qiada.app', password: 'test123' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('test@qiada.app');
  });

  it('rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@qiada.app', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects nonexistent user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'noone@qiada.app', password: 'test123' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns user info with valid token', async () => {
    // Login first
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@qiada.app', password: 'test123' },
    });
    const { token } = loginRes.json();

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe('test@qiada.app');
  });

  it('rejects without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/auth/activate', () => {
  it('activates a valid code', async () => {
    // Create a test code
    await app.db.insert(accessCodes).values({
      code: 'TEST-CODE-1234',
      durationMinutes: 60 * 24 * 7, // 1 week
    });

    // Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@qiada.app', password: 'test123' },
    });
    const { token } = loginRes.json();

    // Activate
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/activate',
      headers: { authorization: `Bearer ${token}` },
      payload: { code: 'TEST-CODE-1234' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toBe('Code activated');
    expect(body.expiresAt).toBeDefined();
  });

  it('rejects already used code', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@qiada.app', password: 'test123' },
    });
    const { token } = loginRes.json();

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/activate',
      headers: { authorization: `Bearer ${token}` },
      payload: { code: 'TEST-CODE-1234' },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('generateAccessCode', () => {
  it('generates valid format XXXX-XXXX-XXXX', () => {
    const code = generateAccessCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateAccessCode()));
    expect(codes.size).toBe(100);
  });
});
