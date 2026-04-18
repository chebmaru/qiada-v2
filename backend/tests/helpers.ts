import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { createDb } from '../src/db/connection.js';
import { healthRoutes } from '../src/routes/health.js';
import { chapterRoutes } from '../src/routes/chapters.js';
import { topicRoutes } from '../src/routes/topics.js';
import { questionRoutes } from '../src/routes/questions.js';
import { glossaryRoutes } from '../src/routes/glossary.js';
import { authRoutes } from '../src/routes/auth.js';
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
  await app.register(glossaryRoutes, { prefix: '/api' });

  await app.ready();
  return app;
}
