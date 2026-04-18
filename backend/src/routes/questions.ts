import type { FastifyPluginAsync } from 'fastify';
import { eq, sql, and } from 'drizzle-orm';
import { questions } from '../db/schema/questions.js';

export const questionRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/questions — paginated, filterable
  app.get<{
    Querystring: { chapterId?: string; topicKey?: string; limit?: string; offset?: string }
  }>('/questions', async (req) => {
    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const offset = Number(req.query.offset) || 0;

    const conditions = [];
    if (req.query.chapterId) {
      conditions.push(eq(questions.chapterId, Number(req.query.chapterId)));
    }
    if (req.query.topicKey) {
      conditions.push(eq(questions.topicKey, req.query.topicKey));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      app.db.select().from(questions).where(where).limit(limit).offset(offset),
      app.db.select({ total: sql<number>`count(*)` }).from(questions).where(where),
    ]);

    return { data: rows, total: Number(total), limit, offset };
  });

  // GET /api/questions/random — random N questions
  app.get<{
    Querystring: { n?: string; chapterId?: string }
  }>('/questions/random', async (req) => {
    const n = Math.min(Number(req.query.n) || 40, 100);

    const conditions = [];
    if (req.query.chapterId) {
      conditions.push(eq(questions.chapterId, Number(req.query.chapterId)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await app.db.select().from(questions)
      .where(where)
      .orderBy(sql`random()`)
      .limit(n);

    return rows;
  });

  // GET /api/questions/:code — single question by ministerial code
  app.get<{ Params: { code: string } }>('/questions/:code', async (req, reply) => {
    const [row] = await app.db.select().from(questions)
      .where(eq(questions.code, req.params.code));
    if (!row) return reply.code(404).send({ error: 'Question not found' });
    return row;
  });
};
