import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(__dirname, '../../../content/enriched');

const pairsData = JSON.parse(readFileSync(resolve(contentDir, 'confusing-pairs.json'), 'utf-8'));
const allPairs: any[] = pairsData.allPairs || [];

export async function confusingPairsRoutes(app: FastifyInstance) {
  app.get('/confusing-pairs', async (req) => {
    const { topicKey, limit = '20', offset = '0' } = req.query as {
      topicKey?: string;
      limit?: string;
      offset?: string;
    };

    const l = Math.min(parseInt(limit, 10) || 20, 50);
    const o = parseInt(offset, 10) || 0;

    let filtered = topicKey
      ? allPairs.filter((p) => p.topicKey === topicKey)
      : allPairs;

    return {
      data: filtered.slice(o, o + l),
      total: filtered.length,
      limit: l,
      offset: o,
    };
  });
}
