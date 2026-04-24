import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { buildApp } from './helpers.js';
import { eq, sql } from 'drizzle-orm';
import { users } from '../src/db/schema/users.js';
import { accessCodes } from '../src/db/schema/access-codes.js';

const app = await buildApp();

const SUFFIX = Date.now();
const EMAIL_MAIN = `sub-main-${SUFFIX}@qiada.app`;
const EMAIL_EXPIRED = `sub-expired-${SUFFIX}@qiada.app`;
const EMAIL_NOSUB = `sub-nosub-${SUFFIX}@qiada.app`;
const EMAIL_ADMIN = `sub-admin-${SUFFIX}@qiada.app`;
const PASSWORD = 'test123456';

let mainToken: string;
let mainUserId: number;
let expiredToken: string;
let expiredUserId: number;
let nosubToken: string;
let nosubUserId: number;
let adminToken: string;
let adminUserId: number;

async function cleanupUser(email: string) {
  const existing = await app.db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    const uid = existing[0].id;
    await app.db.execute(sql`DELETE FROM user_question_stats WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_daily_activity WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM quiz_attempts WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM access_codes WHERE user_id = ${uid}`);
    await app.db.execute(sql`DELETE FROM push_subscriptions WHERE user_id = ${uid}`);
    await app.db.delete(users).where(eq(users.email, email));
  }
}

async function registerAndLogin(email: string): Promise<{ token: string; userId: number }> {
  await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: PASSWORD, name: 'Test User' },
  });
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: PASSWORD },
  });
  const body = loginRes.json();
  return { token: body.token, userId: body.user.id };
}

beforeAll(async () => {
  // Cleanup all test users
  for (const email of [EMAIL_MAIN, EMAIL_EXPIRED, EMAIL_NOSUB, EMAIL_ADMIN]) {
    await cleanupUser(email);
  }

  // Register main user with active subscription
  const main = await registerAndLogin(EMAIL_MAIN);
  mainToken = main.token;
  mainUserId = main.userId;
  await app.db.insert(accessCodes).values({
    code: `SUB-ACTIVE-${SUFFIX}`,
    durationMinutes: 60 * 24 * 7,
    userId: mainUserId,
    isUsed: true,
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Register expired subscription user
  const expired = await registerAndLogin(EMAIL_EXPIRED);
  expiredToken = expired.token;
  expiredUserId = expired.userId;
  await app.db.insert(accessCodes).values({
    code: `SUB-EXPIRED-${SUFFIX}`,
    durationMinutes: 60,
    userId: expiredUserId,
    isUsed: true,
    activatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // expired 1 hour ago
  });

  // Register user with no subscription
  const nosub = await registerAndLogin(EMAIL_NOSUB);
  nosubToken = nosub.token;
  nosubUserId = nosub.userId;

  // Register admin user
  const admin = await registerAndLogin(EMAIL_ADMIN);
  adminUserId = admin.userId;
  await app.db.update(users).set({ role: 'admin' }).where(eq(users.id, adminUserId));
  // Re-login to get token with admin role
  const adminLoginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: EMAIL_ADMIN, password: PASSWORD },
  });
  adminToken = adminLoginRes.json().token;
});

afterAll(async () => {
  for (const email of [EMAIL_MAIN, EMAIL_EXPIRED, EMAIL_NOSUB, EMAIL_ADMIN]) {
    await cleanupUser(email);
  }
  await app.close();
});

// --- Refresh token ---

describe('POST /api/auth/refresh', () => {
  it('returns new token with valid JWT', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { authorization: `Bearer ${mainToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe('string');
    expect(body.token.split('.')).toHaveLength(3); // valid JWT format
    expect(body.user.email).toBe(EMAIL_MAIN);
  });

  it('returns 401 with no token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { authorization: 'Bearer invalid.jwt.token' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// --- Profile update ---

describe('PUT /api/auth/profile', () => {
  it('updates name fields', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: { authorization: `Bearer ${mainToken}` },
      payload: { nameIt: 'Mario Rossi', nameAr: 'ماريو روسي' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.message).toBe('Profile updated');
    expect(body.user.nameIt).toBe('Mario Rossi');
    expect(body.user.nameAr).toBe('ماريو روسي');
  });

  it('updates password', async () => {
    const newPassword = 'newpass789';
    const res = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: { authorization: `Bearer ${mainToken}` },
      payload: { password: newPassword },
    });
    expect(res.statusCode).toBe(200);

    // Verify new password works
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: EMAIL_MAIN, password: newPassword },
    });
    expect(loginRes.statusCode).toBe(200);

    // Restore original password
    await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      headers: { authorization: `Bearer ${mainToken}` },
      payload: { password: PASSWORD },
    });
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/auth/profile',
      payload: { nameIt: 'Hacker' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// --- Subscription middleware edge cases ---

describe('Subscription middleware', () => {
  it('user with expired subscription gets 403 on /api/quiz/exam', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('user with no subscription gets 403 on /api/quiz/exam', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${nosubToken}` },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('admin bypasses subscription check', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.attemptId).toBeDefined();
    expect(body.questions).toHaveLength(30);
  });
});

// --- /auth/me subscription info ---

describe('GET /api/auth/me — subscription info', () => {
  it('returns subscription info for active subscription', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${mainToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe(EMAIL_MAIN);
    expect(body.subscription).not.toBeNull();
    expect(body.subscription.expiresAt).toBeDefined();
    expect(body.subscription.durationMinutes).toBe(60 * 24 * 7);
    expect(body.subscriptionExpired).toBeUndefined();
  });

  it('returns subscriptionExpired:true for expired subscription', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe(EMAIL_EXPIRED);
    expect(body.subscription).toBeNull();
    expect(body.subscriptionExpired).toBe(true);
  });
});

// --- Code activation edge cases ---

describe('POST /api/auth/activate — edge cases', () => {
  it('returns 404 for nonexistent code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/activate',
      headers: { authorization: `Bearer ${mainToken}` },
      payload: { code: 'DOES-NOT-EXIST' },
    });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe('Code not found');
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/activate',
      payload: { code: 'SOME-CODE-HERE' },
    });
    expect(res.statusCode).toBe(401);
  });
});
