import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

const startedAt = new Date();

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    let dbOk = false;
    try {
      await app.db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch { /* db down */ }

    const now = new Date();
    const uptimeMs = now.getTime() - startedAt.getTime();

    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: now.toISOString(),
      uptime: Math.floor(uptimeMs / 1000),
      db: dbOk,
      version: '2.0.0',
    };
  });
};
