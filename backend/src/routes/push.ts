import type { FastifyInstance } from 'fastify';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { PushService } from '../services/push.js';
import { env } from '../env.js';

export async function pushRoutes(app: FastifyInstance) {
  const pushService = new PushService(
    app.db,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
    env.VAPID_SUBJECT,
  );

  // Public — frontend needs VAPID key to subscribe
  app.get('/push/vapid-key', async () => {
    return { publicKey: env.VAPID_PUBLIC_KEY };
  });

  // Subscribe to push notifications
  app.post('/push/subscribe', async (req, reply) => {
    const user = await requireAuth(req, reply);
    const { subscription } = req.body as { subscription: { endpoint: string; keys: { p256dh: string; auth: string } } };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return reply.code(400).send({ error: 'Invalid subscription object' });
    }

    const result = await pushService.subscribe(user.id, subscription);
    return reply.code(201).send(result);
  });

  // Unsubscribe
  app.delete('/push/unsubscribe', async (req, reply) => {
    const user = await requireAuth(req, reply);
    const { endpoint } = req.body as { endpoint: string };

    if (!endpoint) {
      return reply.code(400).send({ error: 'Endpoint required' });
    }

    const result = await pushService.unsubscribe(user.id, endpoint);
    return result;
  });

  // Admin: send test notification to self
  app.post('/push/test', async (req, reply) => {
    const user = await requireAdmin(req, reply);
    const result = await pushService.sendToUser(user.id, {
      title: 'Qiada Test',
      body: 'Push notifications are working!',
      url: '/',
    });
    return result;
  });
}
