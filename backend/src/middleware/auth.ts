import type { FastifyRequest, FastifyReply } from 'fastify';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser> {
  try {
    const decoded = await req.jwtVerify() as AuthUser;
    return decoded;
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
    throw new Error('Unauthorized');
  }
}

export async function requireSubscription(req: FastifyRequest, reply: FastifyReply, db: any, accessCodesTable: any): Promise<AuthUser> {
  const user = await requireAuth(req, reply);

  // Admin bypasses subscription check
  if (user.role === 'admin') return user;

  const { eq, gt, desc } = await import('drizzle-orm');
  const now = new Date();
  const codes = await db.select({
    expiresAt: accessCodesTable.expiresAt,
  }).from(accessCodesTable)
    .where(eq(accessCodesTable.userId, user.id))
    .orderBy(desc(accessCodesTable.expiresAt))
    .limit(1);

  const sub = codes[0];
  if (!sub?.expiresAt || new Date(sub.expiresAt) <= now) {
    reply.code(403).send({ error: 'Subscription expired', code: 'SUBSCRIPTION_EXPIRED' });
    throw new Error('Subscription expired');
  }

  return user;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser> {
  const user = await requireAuth(req, reply);
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden — admin only' });
    throw new Error('Forbidden');
  }
  return user;
}
