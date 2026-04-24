import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { QuizService } from '../services/quiz.js';
import { SM2Service } from '../services/sm2.js';
import { ProgressService } from '../services/progress.js';
import { requireSubscription } from '../middleware/auth.js';
import { accessCodes } from '../db/schema/access-codes.js';

const practiceStartSchema = z.object({
  topicKey: z.string().optional(),
  chapterId: z.coerce.number().optional(),
  count: z.coerce.number().min(1).max(100).default(20),
});

const submitSchema = z.object({
  attemptId: z.number(),
  answers: z.array(z.object({
    questionId: z.number(),
    answer: z.boolean(),
  })),
});

export const quizRoutes: FastifyPluginAsync = async (app) => {
  const quizService = new QuizService(app.db);
  const sm2Service = new SM2Service(app.db);
  const progressService = new ProgressService(app.db);

  // Helper: extract userId from JWT if present (optional auth)
  async function getUserId(req: any): Promise<number | undefined> {
    try {
      const decoded = await req.jwtVerify() as { id: number };
      return decoded.id;
    } catch {
      return undefined;
    }
  }

  // POST /api/quiz/demo — free demo (5 random questions, no auth)
  app.post('/quiz/demo', async () => {
    return quizService.startPractice({ count: 5 });
  });

  // POST /api/quiz/exam — start exam (40 questions, 30 min) — requires subscription
  app.post('/quiz/exam', async (req, reply) => {
    const user = await requireSubscription(req, reply, app.db, accessCodes);
    return quizService.startExam(user.id);
  });

  // POST /api/quiz/practice — start practice (flexible) — requires subscription
  app.post('/quiz/practice', async (req, reply) => {
    const body = practiceStartSchema.parse(req.body || {});
    const user = await requireSubscription(req, reply, app.db, accessCodes);
    return quizService.startPractice({
      topicKey: body.topicKey,
      chapterId: body.chapterId,
      count: body.count,
      userId: user.id,
    });
  });

  // POST /api/quiz/submit — submit answers + update SM-2 + progress
  app.post('/quiz/submit', async (req, reply) => {
    const body = submitSchema.parse(req.body);
    const userId = await getUserId(req);
    try {
      const result = await quizService.submit(body, userId);

      // Update SM-2 and progress if user is authenticated
      if (userId && result.details) {
        const reviewResults = result.details.map((d: any) => ({
          questionId: d.questionId,
          correct: d.isCorrect,
        }));
        await sm2Service.processResults(userId, reviewResults);
        await progressService.recordActivity(
          userId,
          result.totalQuestions,
          result.correctCount,
          result.durationSeconds,
        );
      }

      return result;
    } catch (err: any) {
      if (err.message === 'Attempt not found') {
        return reply.code(404).send({ error: err.message });
      }
      if (err.message === 'Already submitted') {
        return reply.code(409).send({ error: err.message });
      }
      if (err.message === 'Not your attempt') {
        return reply.code(403).send({ error: err.message });
      }
      if (err.message === 'Time limit exceeded') {
        return reply.code(400).send({ error: err.message });
      }
      throw err;
    }
  });

  // GET /api/quiz/:id — get attempt result (requires auth + ownership)
  app.get<{ Params: { id: string } }>('/quiz/:id', async (req, reply) => {
    const userId = await getUserId(req);
    if (!userId) return reply.code(401).send({ error: 'Unauthorized' });

    const result = await quizService.getResult(Number(req.params.id));
    if (!result) return reply.code(404).send({ error: 'Attempt not found' });

    // Ownership check (allow admin to view any)
    if ((result as any).userId && (result as any).userId !== userId) {
      try {
        const decoded = await req.jwtVerify<{ role: string }>();
        if (decoded.role !== 'admin') {
          return reply.code(403).send({ error: 'Not your attempt' });
        }
      } catch {
        return reply.code(403).send({ error: 'Not your attempt' });
      }
    }

    return result;
  });

  // GET /api/quiz/history — user's quiz history (requires auth)
  app.get('/quiz/history', async (req, reply) => {
    let decoded: { id: number };
    try {
      decoded = await req.jwtVerify<{ id: number }>();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    return quizService.getHistory(decoded.id);
  });
};
