import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { questions } from '../db/schema/questions.js';
import { topics } from '../db/schema/topics.js';
import { chapters } from '../db/schema/chapters.js';
import { quizAttempts } from '../db/schema/quiz-attempts.js';
import { users } from '../db/schema/users.js';
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
};
