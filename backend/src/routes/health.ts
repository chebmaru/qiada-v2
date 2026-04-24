import type { FastifyPluginAsync } from 'fastify';
import { sql, eq, gte, desc, and } from 'drizzle-orm';
import { analyticsEvents } from '../db/schema/analytics.js';
import { users } from '../db/schema/users.js';
import { quizAttempts } from '../db/schema/quiz-attempts.js';
import { requireAdmin } from '../middleware/auth.js';

const startedAt = new Date();

// In-memory buffer — batch-insert every 30s or when buffer > 50
let buffer: Array<{ userId?: number; event: string; path?: string; metadata?: unknown; ip?: string }> = [];
let totalPageviews = 0;

function startFlushInterval(app: { db: any }) {
  setInterval(async () => {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    try {
      await app.db.insert(analyticsEvents).values(batch);
    } catch {
      // Re-queue on failure (only once)
      buffer.unshift(...batch);
    }
  }, 30_000);
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  startFlushInterval(app);

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

  // Lightweight analytics — accepts sendBeacon POST
  app.post('/analytics/pageview', async (req, reply) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { path, referrer } = body as { path?: string; referrer?: string | null };
      if (path) {
        buffer.push({
          event: 'pageview',
          path,
          metadata: referrer ? { referrer } : undefined,
          ip: req.ip,
        });
        totalPageviews++;
        // Flush if buffer gets large
        if (buffer.length >= 50) {
          const batch = buffer.splice(0, buffer.length);
          app.db.insert(analyticsEvents).values(batch).catch(() => {
            buffer.unshift(...batch);
          });
        }
      }
    } catch { /* ignore malformed */ }
    return reply.code(204).send();
  });

  // Track custom event (quiz_start, quiz_complete, etc.)
  app.post('/analytics/event', async (req, reply) => {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { event, path, metadata } = body as { event?: string; path?: string; metadata?: unknown };
      if (event) {
        const userId = (req as any).user?.id || undefined;
        buffer.push({ userId, event, path, metadata, ip: req.ip });
      }
    } catch { /* ignore */ }
    return reply.code(204).send();
  });

  // Admin: analytics dashboard data
  app.get('/analytics/dashboard', async (req, reply) => {
    await requireAdmin(req, reply);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries
    const [
      todayPageviews,
      weekPageviews,
      todayUniqueIps,
      topPagesToday,
      todayEvents,
      recentUsers,
      todayQuizzes,
    ] = await Promise.all([
      // Total pageviews today
      app.db.select({ count: sql<number>`count(*)` })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.event, 'pageview'), gte(analyticsEvents.createdAt, today))),

      // Total pageviews last 7 days
      app.db.select({ count: sql<number>`count(*)` })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.event, 'pageview'), gte(analyticsEvents.createdAt, weekAgo))),

      // Unique IPs today
      app.db.select({ count: sql<number>`count(distinct ${analyticsEvents.ip})` })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.event, 'pageview'), gte(analyticsEvents.createdAt, today))),

      // Top 10 pages today
      app.db.select({
        path: analyticsEvents.path,
        count: sql<number>`count(*)`,
      })
        .from(analyticsEvents)
        .where(and(eq(analyticsEvents.event, 'pageview'), gte(analyticsEvents.createdAt, today)))
        .groupBy(analyticsEvents.path)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Event breakdown today (quiz_start, quiz_complete, login, etc.)
      app.db.select({
        event: analyticsEvents.event,
        count: sql<number>`count(*)`,
      })
        .from(analyticsEvents)
        .where(gte(analyticsEvents.createdAt, today))
        .groupBy(analyticsEvents.event)
        .orderBy(desc(sql`count(*)`)),

      // Recent user activity (last 10 logins)
      app.db.select({
        id: users.id,
        email: users.email,
        nameIt: users.nameIt,
        lastLogin: sql<string>`max(${analyticsEvents.createdAt})`,
        eventCount: sql<number>`count(*)`,
      })
        .from(analyticsEvents)
        .innerJoin(users, eq(analyticsEvents.userId, users.id))
        .where(gte(analyticsEvents.createdAt, weekAgo))
        .groupBy(users.id, users.email, users.nameIt)
        .orderBy(desc(sql`max(${analyticsEvents.createdAt})`))
        .limit(10),

      // Quizzes completed today
      app.db.select({ count: sql<number>`count(*)` })
        .from(quizAttempts)
        .where(gte(quizAttempts.startedAt, today)),
    ]);

    return {
      today: {
        pageviews: Number(todayPageviews[0].count),
        uniqueVisitors: Number(todayUniqueIps[0].count),
        quizzesCompleted: Number(todayQuizzes[0].count),
      },
      week: {
        pageviews: Number(weekPageviews[0].count),
      },
      topPages: topPagesToday.map(p => ({ path: p.path, count: Number(p.count) })),
      eventBreakdown: todayEvents.map(e => ({ event: e.event, count: Number(e.count) })),
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.nameIt,
        lastSeen: u.lastLogin,
        actions: Number(u.eventCount),
      })),
    };
  });

  // Admin: user activity detail
  app.get<{ Params: { userId: string } }>('/analytics/user/:userId', async (req, reply) => {
    await requireAdmin(req, reply);

    const userId = Number(req.params.userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [userInfo] = await app.db.select({
      id: users.id,
      email: users.email,
      nameIt: users.nameIt,
      nameAr: users.nameAr,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId));

    if (!userInfo) return reply.code(404).send({ error: 'User not found' });

    const events = await app.db.select({
      event: analyticsEvents.event,
      path: analyticsEvents.path,
      metadata: analyticsEvents.metadata,
      createdAt: analyticsEvents.createdAt,
    })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.userId, userId))
      .orderBy(desc(analyticsEvents.createdAt))
      .limit(50);

    const quizzes = await app.db.select()
      .from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.startedAt))
      .limit(20);

    return { user: userInfo, events, quizzes };
  });

  // Backward compatible summary (admin only)
  app.get('/analytics/summary', async (req, reply) => {
    await requireAdmin(req, reply);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topPages = await app.db.select({
      path: analyticsEvents.path,
      count: sql<number>`count(*)`,
    })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.event, 'pageview'), gte(analyticsEvents.createdAt, today)))
      .groupBy(analyticsEvents.path)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    return {
      totalPageviews,
      topPages: topPages.map(p => ({ path: p.path, count: Number(p.count) })),
    };
  });
};
