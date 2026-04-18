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

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<AuthUser> {
  const user = await requireAuth(req, reply);
  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Forbidden — admin only' });
    throw new Error('Forbidden');
  }
  return user;
}
