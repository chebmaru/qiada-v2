import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { createDb } from '../src/db/connection.js';
import { healthRoutes } from '../src/routes/health.js';
import { chapterRoutes } from '../src/routes/chapters.js';
import { topicRoutes } from '../src/routes/topics.js';
import { questionRoutes } from '../src/routes/questions.js';
import { glossaryRoutes } from '../src/routes/glossary.js';
import { lessonRoutes } from '../src/routes/lessons.js';
import { authRoutes } from '../src/routes/auth.js';
import { quizRoutes } from '../src/routes/quiz.js';
import { progressRoutes } from '../src/routes/progress.js';
import { adminRoutes } from '../src/routes/admin.js';
import { pushRoutes } from '../src/routes/push.js';
import 'dotenv/config';

export async function buildApp() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('DATABASE_URL not set');

  const app = Fastify({ logger: false });
  const db = createDb(dbUrl);
  app.decorate('db', db);

  await app.register(cors);
  await app.register(jwt, { secret: 'test-secret-min-32-chars-long-enough' });
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(chapterRoutes, { prefix: '/api' });
  await app.register(topicRoutes, { prefix: '/api' });
  await app.register(questionRoutes, { prefix: '/api' });
  await app.register(lessonRoutes, { prefix: '/api' });
  await app.register(glossaryRoutes, { prefix: '/api' });
  await app.register(quizRoutes, { prefix: '/api' });
  await app.register(progressRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api' });
  await app.register(pushRoutes, { prefix: '/api' });

  await app.ready();
  return app;
}
