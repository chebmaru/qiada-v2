import type { Database } from './db/connection.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
  }
}
