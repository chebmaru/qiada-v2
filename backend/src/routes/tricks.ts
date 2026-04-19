import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(__dirname, '../../../content/enriched');

// Load once at startup
const tricksData = JSON.parse(readFileSync(resolve(contentDir, 'tricks-by-topic.json'), 'utf-8'));
const paroleData = JSON.parse(readFileSync(resolve(contentDir, 'parole-amiche.json'), 'utf-8'));

const tricksMap: Record<string, any> = tricksData.topics; // { topicKey: { truePatternsIT, ... } }

export async function tricksRoutes(app: FastifyInstance) {
  // Get tricks for a specific topic
  app.get('/tricks/:topicKey', async (req, reply) => {
    const { topicKey } = req.params as { topicKey: string };
    const tricks = tricksMap[topicKey];
    if (!tricks) return reply.code(404).send({ error: 'Topic not found' });
    return { topicKey, ...tricks };
  });

  // List all topics with tricks (paginated)
  app.get('/tricks', async (req) => {
    const { limit = '20', offset = '0' } = req.query as { limit?: string; offset?: string };
    const l = Math.min(parseInt(limit, 10) || 20, 100);
    const o = parseInt(offset, 10) || 0;

    const allKeys = Object.keys(tricksMap);
    const page = allKeys.slice(o, o + l);

    return {
      data: page.map((k) => ({ topicKey: k, ...tricksMap[k] })),
      total: allKeys.length,
      limit: l,
      offset: o,
    };
  });

  // Keyword hints (parole amiche)
  app.get('/keywords', async () => {
    return {
      onlyTrue: paroleData.onlyTrue || [],
      onlyFalse: paroleData.onlyFalse || [],
      mostlyTrue: paroleData.mostlyTrue || [],
      mostlyFalse: paroleData.mostlyFalse || [],
    };
  });
}
