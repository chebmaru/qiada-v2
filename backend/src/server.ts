import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './env.js';
import { createDb } from './db/connection.js';
import { healthRoutes } from './routes/health.js';
import { chapterRoutes } from './routes/chapters.js';
import { topicRoutes } from './routes/topics.js';
import { questionRoutes } from './routes/questions.js';
import { glossaryRoutes } from './routes/glossary.js';
import { lessonRoutes } from './routes/lessons.js';
import { authRoutes } from './routes/auth.js';
import { quizRoutes } from './routes/quiz.js';
import { progressRoutes } from './routes/progress.js';
import { adminRoutes } from './routes/admin.js';
import { pushRoutes } from './routes/push.js';
import { tricksRoutes } from './routes/tricks.js';
import { confusingPairsRoutes } from './routes/confusing-pairs.js';
import { ZodError } from 'zod';

const app = Fastify({ logger: true });

// Global error handler: Zod validation → 400
app.setErrorHandler((error: Error & { statusCode?: number }, _req, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: 'Validation failed', details: error.flatten().fieldErrors });
  }
  if (error.statusCode) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  app.log.error(error);
  return reply.code(500).send({ error: 'Internal server error' });
});

// DB
const db = createDb(env.DATABASE_URL);
app.decorate('db', db);

// Plugins
await app.register(cors, {
  origin: env.NODE_ENV === 'development' ? true : env.FRONTEND_URL,
});
await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});
await app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  } : false,
});
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// Routes
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
await app.register(tricksRoutes, { prefix: '/api' });
await app.register(confusingPairsRoutes, { prefix: '/api' });

// Start
try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on port ${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
