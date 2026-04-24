import type { FastifyPluginAsync } from 'fastify';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { questions } from '../db/schema/questions.js';
import { topics } from '../db/schema/topics.js';
import { chapters } from '../db/schema/chapters.js';
import { quizAttempts } from '../db/schema/quiz-attempts.js';
import { users } from '../db/schema/users.js';
import { accessCodes } from '../db/schema/access-codes.js';
import { requireAdmin } from '../middleware/auth.js';

const questionSchema = z.object({
  code: z.string().min(1),
  textIt: z.string().min(1),
  textAr: z.string().min(1),
  explanationIt: z.string().optional().default(''),
  explanationAr: z.string().optional().default(''),
  isTrue: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  chapterId: z.number(),
  topicKey: z.string(),
});

const topicSchema = z.object({
  topicKey: z.string().min(1),
  titleIt: z.string().min(1),
  titleAr: z.string().min(1),
  contentIt: z.string().optional().default(''),
  contentAr: z.string().optional().default(''),
  imageUrl: z.string().nullable().optional(),
  chapterId: z.number().nullable().optional(),
  sortOrder: z.number().optional().default(0),
  questionCount: z.number().optional().default(0),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {

  // GET /api/admin/stats — overview stats
  app.get('/admin/stats', async (req, reply) => {
    await requireAdmin(req, reply);

    const [qCount] = await app.db.select({ count: sql<number>`count(*)` }).from(questions);
    const [tCount] = await app.db.select({ count: sql<number>`count(*)` }).from(topics);
    const [cCount] = await app.db.select({ count: sql<number>`count(*)` }).from(chapters);
    const [uCount] = await app.db.select({ count: sql<number>`count(*)` }).from(users);
    const [aCount] = await app.db.select({ count: sql<number>`count(*)` }).from(quizAttempts);

    return {
      questions: Number(qCount.count),
      topics: Number(tCount.count),
      chapters: Number(cCount.count),
      users: Number(uCount.count),
      quizAttempts: Number(aCount.count),
    };
  });

  // --- Questions CRUD ---

  // POST /api/admin/questions — create question
  app.post('/admin/questions', async (req, reply) => {
    await requireAdmin(req, reply);
    const body = questionSchema.parse(req.body);
    const [created] = await app.db.insert(questions).values(body).returning();
    return reply.code(201).send(created);
  });

  // PUT /api/admin/questions/:id — update question
  app.put<{ Params: { id: string } }>('/admin/questions/:id', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);
    const body = questionSchema.partial().parse(req.body);

    const [updated] = await app.db.update(questions)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(questions.id, id))
      .returning();

    if (!updated) return reply.code(404).send({ error: 'Question not found' });
    return updated;
  });

  // DELETE /api/admin/questions/:id — delete question
  app.delete<{ Params: { id: string } }>('/admin/questions/:id', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);

    const [deleted] = await app.db.delete(questions)
      .where(eq(questions.id, id))
      .returning({ id: questions.id });

    if (!deleted) return reply.code(404).send({ error: 'Question not found' });
    return { message: 'Deleted', id: deleted.id };
  });

  // --- Topics CRUD ---

  // POST /api/admin/topics — create topic
  app.post('/admin/topics', async (req, reply) => {
    await requireAdmin(req, reply);
    const body = topicSchema.parse(req.body);
    const [created] = await app.db.insert(topics).values(body).returning();
    return reply.code(201).send(created);
  });

  // PUT /api/admin/topics/:id — update topic
  app.put<{ Params: { id: string } }>('/admin/topics/:id', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);
    const body = topicSchema.partial().parse(req.body);

    const [updated] = await app.db.update(topics)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(topics.id, id))
      .returning();

    if (!updated) return reply.code(404).send({ error: 'Topic not found' });
    return updated;
  });

  // DELETE /api/admin/topics/:id — delete topic
  app.delete<{ Params: { id: string } }>('/admin/topics/:id', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);

    const [deleted] = await app.db.delete(topics)
      .where(eq(topics.id, id))
      .returning({ id: topics.id });

    if (!deleted) return reply.code(404).send({ error: 'Topic not found' });
    return { message: 'Deleted', id: deleted.id };
  });

  // ═══ ACCESS CODES CRUD ═══

  // GET /api/admin/codes — list all access codes
  app.get('/admin/codes', async (req, reply) => {
    await requireAdmin(req, reply);

    const codes = await app.db.select({
      id: accessCodes.id,
      code: accessCodes.code,
      durationMinutes: accessCodes.durationMinutes,
      isUsed: accessCodes.isUsed,
      activatedAt: accessCodes.activatedAt,
      expiresAt: accessCodes.expiresAt,
      userId: accessCodes.userId,
      createdAt: accessCodes.createdAt,
    }).from(accessCodes).orderBy(desc(accessCodes.createdAt)).limit(200);

    return codes;
  });

  // POST /api/admin/codes — generate new access codes
  app.post('/admin/codes', async (req, reply) => {
    await requireAdmin(req, reply);

    const body = z.object({
      count: z.number().min(1).max(50).default(1),
      durationMinutes: z.number().min(60), // min 1 hour
    }).parse(req.body);

    const newCodes: { code: string; durationMinutes: number }[] = [];
    for (let i = 0; i < body.count; i++) {
      newCodes.push({
        code: 'QIA-' + crypto.randomBytes(6).toString('hex').toUpperCase(),
        durationMinutes: body.durationMinutes,
      });
    }

    const inserted = await app.db.insert(accessCodes).values(newCodes).returning();
    return reply.code(201).send(inserted);
  });

  // PUT /api/admin/codes/:id/extend — extend duration
  app.put<{ Params: { id: string } }>('/admin/codes/:id/extend', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);
    const body = z.object({ addMinutes: z.number().min(1) }).parse(req.body);

    const [existing] = await app.db.select().from(accessCodes).where(eq(accessCodes.id, id));
    if (!existing) return reply.code(404).send({ error: 'Code not found' });

    const updates: Record<string, unknown> = {
      durationMinutes: existing.durationMinutes + body.addMinutes,
    };

    // If already activated, extend expiresAt too
    if (existing.expiresAt) {
      updates.expiresAt = new Date(new Date(existing.expiresAt).getTime() + body.addMinutes * 60 * 1000);
    }

    const [updated] = await app.db.update(accessCodes).set(updates).where(eq(accessCodes.id, id)).returning();
    return updated;
  });

  // PUT /api/admin/codes/:id/revoke — revoke (expire immediately)
  app.put<{ Params: { id: string } }>('/admin/codes/:id/revoke', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);

    const [updated] = await app.db.update(accessCodes)
      .set({ expiresAt: new Date(), isUsed: true })
      .where(eq(accessCodes.id, id))
      .returning();

    if (!updated) return reply.code(404).send({ error: 'Code not found' });
    return updated;
  });

  // DELETE /api/admin/codes/:id — delete unused code
  app.delete<{ Params: { id: string } }>('/admin/codes/:id', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);

    const [existing] = await app.db.select().from(accessCodes).where(eq(accessCodes.id, id));
    if (!existing) return reply.code(404).send({ error: 'Code not found' });
    if (existing.isUsed) return reply.code(409).send({ error: 'Cannot delete used code' });

    await app.db.delete(accessCodes).where(eq(accessCodes.id, id));
    return { message: 'Deleted', id };
  });

  // ═══ USERS MANAGEMENT ═══

  // GET /api/admin/users — list all users
  app.get('/admin/users', async (req, reply) => {
    await requireAdmin(req, reply);

    const allUsers = await app.db.select({
      id: users.id,
      email: users.email,
      nameIt: users.nameIt,
      nameAr: users.nameAr,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(500);

    return allUsers;
  });

  // PUT /api/admin/users/:id/role — change user role
  app.put<{ Params: { id: string } }>('/admin/users/:id/role', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);
    const body = z.object({ role: z.enum(['student', 'admin']) }).parse(req.body);

    const [updated] = await app.db.update(users)
      .set({ role: body.role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role });

    if (!updated) return reply.code(404).send({ error: 'User not found' });
    return updated;
  });

  // PUT /api/admin/users/:id/toggle — activate/deactivate user
  app.put<{ Params: { id: string } }>('/admin/users/:id/toggle', async (req, reply) => {
    await requireAdmin(req, reply);
    const id = Number(req.params.id);

    const [user] = await app.db.select({ isActive: users.isActive }).from(users).where(eq(users.id, id));
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const [updated] = await app.db.update(users)
      .set({ isActive: !user.isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, isActive: users.isActive });

    return updated;
  });
};
