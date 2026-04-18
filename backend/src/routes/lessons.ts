import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';
import { lessons } from '../db/schema/lessons.js';
import { topics } from '../db/schema/topics.js';

export const lessonRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/lessons — list, filterable by ?chapterId=
  app.get<{ Querystring: { chapterId?: string } }>('/lessons', async (req) => {
    const { chapterId } = req.query;

    if (chapterId) {
      return app.db.select().from(lessons)
        .where(eq(lessons.chapterId, Number(chapterId)))
        .orderBy(lessons.sortOrder);
    }

    return app.db.select().from(lessons).orderBy(lessons.sortOrder);
  });

  // GET /api/lessons/:id — single lesson with related topics
  app.get<{ Params: { id: string } }>('/lessons/:id', async (req, reply) => {
    const [lesson] = await app.db.select().from(lessons)
      .where(eq(lessons.id, req.params.id));

    if (!lesson) return reply.code(404).send({ error: 'Lesson not found' });

    const relatedTopics = await app.db.select().from(topics)
      .where(eq(topics.lessonId, lesson.id))
      .orderBy(topics.sortOrder);

    return { ...lesson, topics: relatedTopics };
  });
};
