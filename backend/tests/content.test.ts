import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from './helpers.js';

const app = await buildApp();
afterAll(() => app.close());

// --- Bilingual content consistency ---

describe('Content: bilingual completeness', () => {
  it('all chapters have both IT and AR names', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chapters' });
    const chapters = res.json();
    for (const ch of chapters) {
      expect(ch.nameIt).toBeTruthy();
      expect(ch.nameAr).toBeTruthy();
      expect(ch.nameIt.length).toBeGreaterThan(0);
      expect(ch.nameAr.length).toBeGreaterThan(0);
    }
  });

  it('all topics have both IT and AR titles', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics' });
    const topics = res.json();
    expect(topics.length).toBe(393);
    for (const t of topics) {
      expect(t.titleIt).toBeTruthy();
      expect(t.titleAr).toBeTruthy();
    }
  });

  it('glossary terms have both languages', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/glossary' });
    const terms = res.json();
    for (const t of terms) {
      expect(t.termIt).toBeTruthy();
      expect(t.termAr).toBeTruthy();
      expect(t.definitionIt).toBeTruthy();
      expect(t.definitionAr).toBeTruthy();
    }
  });

  it('questions have both IT and AR text', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=50' });
    const { data } = res.json();
    for (const q of data) {
      expect(q.textIt).toBeTruthy();
      expect(q.textAr).toBeTruthy();
    }
  });
});

// --- Pagination edge cases ---

describe('Content: pagination', () => {
  it('questions offset works correctly', async () => {
    const res1 = await app.inject({ method: 'GET', url: '/api/questions?limit=5&offset=0' });
    const res2 = await app.inject({ method: 'GET', url: '/api/questions?limit=5&offset=5' });
    const data1 = res1.json().data;
    const data2 = res2.json().data;
    // No overlap
    const ids1 = data1.map((q: any) => q.id);
    const ids2 = data2.map((q: any) => q.id);
    for (const id of ids1) {
      expect(ids2).not.toContain(id);
    }
  });

  it('questions total is consistent', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=1' });
    const body = res.json();
    expect(body.total).toBe(6845);
  });

  it('offset beyond total returns empty data', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=10&offset=99999' });
    const body = res.json();
    expect(body.data).toHaveLength(0);
    expect(body.total).toBe(6845);
  });

  it('zero offset returns first page', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions?limit=5&offset=0' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBe(5);
    expect(body.offset).toBe(0);
  });

  it('confusing pairs pagination works', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/confusing-pairs?limit=5&offset=0' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data).toHaveLength(5);
    expect(body.total).toBeGreaterThan(0);
  });
});

// --- Data integrity ---

describe('Content: data integrity', () => {
  it('chapters are ordered by number 1-25', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/chapters' });
    const chapters = res.json();
    expect(chapters).toHaveLength(25);
    for (let i = 0; i < chapters.length - 1; i++) {
      expect(chapters[i].number).toBeLessThan(chapters[i + 1].number);
    }
  });

  it('every question has a valid chapterId', async () => {
    const chapRes = await app.inject({ method: 'GET', url: '/api/chapters' });
    const validIds = new Set(chapRes.json().map((c: any) => c.id));

    const qRes = await app.inject({ method: 'GET', url: '/api/questions?limit=100' });
    for (const q of qRes.json().data) {
      expect(validIds.has(q.chapterId)).toBe(true);
    }
  });

  it('topics filter by chapter returns only that chapter', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics?chapterId=1' });
    const topics = res.json();
    for (const t of topics) {
      expect(t.chapterId).toBe(1);
    }
  });

  it('quiz demo always returns exactly 5 questions', async () => {
    const results = await Promise.all(
      Array(3).fill(null).map(() => app.inject({ method: 'POST', url: '/api/quiz/demo' }))
    );
    for (const res of results) {
      expect(res.json().questions).toHaveLength(5);
    }
  });

  it('quiz demo questions are random (different each time)', async () => {
    const res1 = await app.inject({ method: 'POST', url: '/api/quiz/demo' });
    const res2 = await app.inject({ method: 'POST', url: '/api/quiz/demo' });
    const ids1 = res1.json().questions.map((q: any) => q.id).sort();
    const ids2 = res2.json().questions.map((q: any) => q.id).sort();
    // Very unlikely to be identical with 6845 questions
    expect(ids1).not.toEqual(ids2);
  });

  it('exam has exactly 30 questions from weighted chapters', async () => {
    // Register a user with subscription for this test
    const email = `content-exam-${Date.now()}@qiada.app`;
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'test123456' } });
    const token = regRes.json().token;
    const userId = regRes.json().user.id;

    // Add subscription
    const { accessCodes } = await import('../src/db/schema/access-codes.js');
    await app.db.insert(accessCodes).values({
      code: `CONTENT-${Date.now()}`,
      durationMinutes: 60,
      userId,
      isUsed: true,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/quiz/exam',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.json().questions).toHaveLength(30);

    // Cleanup
    const { eq, sql } = await import('drizzle-orm');
    const { users } = await import('../src/db/schema/users.js');
    await app.db.execute(sql`DELETE FROM quiz_attempts WHERE user_id = ${userId}`);
    await app.db.execute(sql`DELETE FROM access_codes WHERE user_id = ${userId}`);
    await app.db.delete(users).where(eq(users.email, email));
  });
});

// --- Error responses ---

describe('Content: error handling', () => {
  it('nonexistent question code returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/questions/ZZZZZZ' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Question not found');
  });

  it('nonexistent topic returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics/nonexistent_topic_xyz' });
    expect(res.statusCode).toBe(404);
  });

  it('nonexistent quiz attempt returns 404', async () => {
    // Need auth first
    const email = `err-${Date.now()}@qiada.app`;
    const regRes = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'test123456' } });
    const token = regRes.json().token;

    const res = await app.inject({
      method: 'GET',
      url: '/api/quiz/999999',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(404);

    // Cleanup
    const { eq } = await import('drizzle-orm');
    const { users } = await import('../src/db/schema/users.js');
    await app.db.delete(users).where(eq(users.email, email));
  });

  it('health endpoint always returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });
});
