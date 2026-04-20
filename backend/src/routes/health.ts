import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

const startedAt = new Date();

// In-memory analytics buffer — flushed to DB periodically
const pageviews: Array<{ path: string; referrer: string | null; ts: number }> = [];
let totalPageviews = 0;

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
      totalPageviews,
    };
  });

  // Lightweight analytics endpoint — accepts sendBeacon POST
  app.post('/analytics/pageview', async (req, reply) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { path, referrer, ts } = body as { path?: string; referrer?: string | null; ts?: number };
      if (path) {
        pageviews.push({ path, referrer: referrer || null, ts: ts || Date.now() });
        totalPageviews++;
        // Keep only last 1000 in memory
        if (pageviews.length > 1000) pageviews.splice(0, pageviews.length - 1000);
      }
    } catch { /* ignore malformed */ }
    return reply.code(204).send();
  });

  // Admin: get analytics summary
  app.get('/analytics/summary', async (req, reply) => {
    // Count by path
    const pathCounts = new Map<string, number>();
    for (const pv of pageviews) {
      pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1);
    }
    const topPages = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([path, count]) => ({ path, count }));

    return {
      totalPageviews,
      recentPageviews: pageviews.length,
      topPages,
    };
  });
};
