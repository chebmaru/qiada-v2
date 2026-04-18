import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    let dbOk = false;
    try {
      await app.db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch { /* db down */ }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: dbOk,
    };
  });
};
