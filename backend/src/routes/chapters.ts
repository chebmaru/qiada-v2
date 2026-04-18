import type { FastifyPluginAsync } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import { chapters } from '../db/schema/chapters.js';
import { questions } from '../db/schema/questions.js';

export const chapterRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/chapters — list all with question count
  app.get('/chapters', async () => {
    const rows = await app.db
      .select({
        id: chapters.id,
        number: chapters.number,
        nameIt: chapters.nameIt,
        nameAr: chapters.nameAr,
        coverImageUrl: chapters.coverImageUrl,
        ministryWeight: chapters.ministryWeight,
        questionCount: sql<number>`(SELECT count(*) FROM questions WHERE questions.chapter_id = ${chapters.id})`,
      })
      .from(chapters)
      .orderBy(chapters.number);
    return rows;
  });

  // GET /api/chapters/:id — single chapter
  app.get<{ Params: { id: string } }>('/chapters/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const [row] = await app.db.select().from(chapters).where(eq(chapters.id, id));
    if (!row) return reply.code(404).send({ error: 'Chapter not found' });
    return row;
  });
};
