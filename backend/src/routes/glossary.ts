import type { FastifyPluginAsync } from 'fastify';
import { glossary } from '../db/schema/glossary.js';

export const glossaryRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/glossary — list all
  app.get('/glossary', async () => {
    return app.db.select().from(glossary).orderBy(glossary.termIt);
  });
};
