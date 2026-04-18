import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { topics } from '../db/schema/topics.js';

export const topicRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/topics — list, filterable by ?chapterId=
  app.get<{ Querystring: { chapterId?: string } }>('/topics', async (req) => {
    const { chapterId } = req.query;
    let query = app.db.select().from(topics).orderBy(topics.sortOrder);

    if (chapterId) {
      return app.db.select().from(topics)
        .where(eq(topics.chapterId, Number(chapterId)))
        .orderBy(topics.sortOrder);
    }

    return query;
  });

  // GET /api/topics/:topicKey — single topic
  app.get<{ Params: { topicKey: string } }>('/topics/:topicKey', async (req, reply) => {
    const [row] = await app.db.select().from(topics)
      .where(eq(topics.topicKey, req.params.topicKey));
    if (!row) return reply.code(404).send({ error: 'Topic not found' });
    return row;
  });
};
