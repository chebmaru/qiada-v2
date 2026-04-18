import type { FastifyPluginAsync } from 'fastify';
import { ProgressService } from '../services/progress.js';
import { SM2Service } from '../services/sm2.js';

export const progressRoutes: FastifyPluginAsync = async (app) => {
  const progressService = new ProgressService(app.db);
  const sm2Service = new SM2Service(app.db);

  // Auth helper
  async function requireAuth(req: any, reply: any): Promise<number> {
    try {
      const decoded = await req.jwtVerify() as { id: number };
      return decoded.id;
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
      throw new Error('Unauthorized');
    }
  }

  // GET /api/progress/dashboard — user's overall progress
  app.get('/progress/dashboard', async (req, reply) => {
    const userId = await requireAuth(req, reply);
    return progressService.getDashboard(userId);
  });

  // GET /api/progress/chapters — per-chapter progress
  app.get('/progress/chapters', async (req, reply) => {
    const userId = await requireAuth(req, reply);
    return progressService.getChapterProgress(userId);
  });

  // GET /api/progress/review — SM-2 due questions
  app.get<{ Querystring: { limit?: string } }>('/progress/review', async (req, reply) => {
    const userId = await requireAuth(req, reply);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    return sm2Service.getDueQuestions(userId, limit);
  });

  // GET /api/progress/weak — weakest questions
  app.get<{ Querystring: { limit?: string } }>('/progress/weak', async (req, reply) => {
    const userId = await requireAuth(req, reply);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    return sm2Service.getWeakQuestions(userId, limit);
  });
};
