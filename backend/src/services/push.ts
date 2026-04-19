import webPush from 'web-push';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { pushSubscriptions } from '../db/schema/push-subscriptions.js';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

interface SubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export class PushService {
  constructor(
    private db: PostgresJsDatabase<any>,
    private vapidPublicKey: string,
    private vapidPrivateKey: string,
    private vapidSubject: string,
  ) {
    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    }
  }

  async subscribe(userId: number, sub: SubscriptionInput) {
    // Upsert by endpoint
    const existing = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, sub.endpoint))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(pushSubscriptions)
        .set({ userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
        .where(eq(pushSubscriptions.endpoint, sub.endpoint));
      return { updated: true };
    }

    await this.db.insert(pushSubscriptions).values({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    });
    return { created: true };
  }

  async unsubscribe(userId: number, endpoint: string) {
    const result = await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return { deleted: result.length > 0 };
  }

  async sendToUser(userId: number, payload: PushPayload) {
    const subs = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
        failed++;
      }
    }

    return { sent, failed };
  }
}
