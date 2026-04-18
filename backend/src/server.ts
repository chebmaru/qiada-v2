import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { createDb } from './db/connection.js';
import { healthRoutes } from './routes/health.js';
import { chapterRoutes } from './routes/chapters.js';
import { topicRoutes } from './routes/topics.js';
import { questionRoutes } from './routes/questions.js';
import { glossaryRoutes } from './routes/glossary.js';

const app = Fastify({ logger: true });

// DB
const db = createDb(env.DATABASE_URL);
app.decorate('db', db);

// Plugins
await app.register(cors, { origin: env.FRONTEND_URL });

// Routes
await app.register(healthRoutes, { prefix: '/api' });
await app.register(chapterRoutes, { prefix: '/api' });
await app.register(topicRoutes, { prefix: '/api' });
await app.register(questionRoutes, { prefix: '/api' });
await app.register(glossaryRoutes, { prefix: '/api' });

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
