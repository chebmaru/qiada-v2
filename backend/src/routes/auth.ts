import type { FastifyPluginAsync } from 'fastify';
import { eq, gt, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { users } from '../db/schema/users.js';
import { accessCodes } from '../db/schema/access-codes.js';
import { hashPassword, verifyPassword } from '../services/auth.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const activateCodeSchema = z.object({
  code: z.string().min(10),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/auth/register (rate limited: 5/min)
  app.post('/auth/register', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = registerSchema.parse(req.body);

    // Check duplicate
    const [existing] = await app.db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email));
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const hash = await hashPassword(body.password);
    const [user] = await app.db.insert(users).values({
      email: body.email,
      passwordHash: hash,
      nameIt: body.name || '',
    }).returning({ id: users.id, email: users.email, role: users.role });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return reply.code(201).send({ token, user });
  });

  // POST /api/auth/login (rate limited: 10/min)
  app.post('/auth/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const [user] = await app.db.select()
      .from(users)
      .where(eq(users.email, body.email));

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  // POST /api/auth/activate — activate an access code
  app.post('/auth/activate', async (req, reply) => {
    const body = activateCodeSchema.parse(req.body);

    // Verify JWT
    let userId: number;
    try {
      const decoded = await req.jwtVerify<{ id: number }>();
      userId = decoded.id;
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Find code
    const [ac] = await app.db.select()
      .from(accessCodes)
      .where(eq(accessCodes.code, body.code.toUpperCase()));

    if (!ac) {
      return reply.code(404).send({ error: 'Code not found' });
    }
    if (ac.isUsed) {
      return reply.code(409).send({ error: 'Code already used' });
    }

    // Atomic activate: WHERE isUsed = false prevents race condition
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ac.durationMinutes * 60 * 1000);

    const [updated] = await app.db.update(accessCodes)
      .set({
        isUsed: true,
        userId,
        activatedAt: now,
        expiresAt,
      })
      .where(and(eq(accessCodes.id, ac.id), eq(accessCodes.isUsed, false)))
      .returning({ id: accessCodes.id });

    if (!updated) {
      return reply.code(409).send({ error: 'Code already used' });
    }

    return { message: 'Code activated', expiresAt: expiresAt.toISOString(), durationMinutes: ac.durationMinutes };
  });

  // PUT /api/auth/profile — update user profile
  app.put('/auth/profile', async (req, reply) => {
    let decoded: { id: number };
    try {
      decoded = await req.jwtVerify<{ id: number }>();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const updateSchema = z.object({
      nameIt: z.string().max(100).optional(),
      nameAr: z.string().max(100).optional(),
      password: z.string().min(6).optional(),
    });
    const body = updateSchema.parse(req.body);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.nameIt !== undefined) updates.nameIt = body.nameIt;
    if (body.nameAr !== undefined) updates.nameAr = body.nameAr;
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    await app.db.update(users).set(updates).where(eq(users.id, decoded.id));

    const [user] = await app.db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      nameIt: users.nameIt,
      nameAr: users.nameAr,
    }).from(users).where(eq(users.id, decoded.id));

    return { message: 'Profile updated', user };
  });

  // GET /api/auth/me — current user info
  app.get('/auth/me', async (req, reply) => {
    let decoded: { id: number };
    try {
      decoded = await req.jwtVerify<{ id: number }>();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const [user] = await app.db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      nameIt: users.nameIt,
      nameAr: users.nameAr,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, decoded.id));

    if (!user) return reply.code(404).send({ error: 'User not found' });

    // Get active (non-expired) access code — most recent first
    const now = new Date();
    const activeCode = await app.db.select({
      expiresAt: accessCodes.expiresAt,
      durationMinutes: accessCodes.durationMinutes,
      activatedAt: accessCodes.activatedAt,
    }).from(accessCodes)
      .where(eq(accessCodes.userId, decoded.id))
      .orderBy(desc(accessCodes.expiresAt))
      .limit(1);

    const sub = activeCode[0] || null;
    const isActive = sub?.expiresAt ? new Date(sub.expiresAt) > now : false;

    return {
      ...user,
      subscription: isActive ? sub : null,
      subscriptionExpired: sub && !isActive ? true : undefined,
    };
  });

  // POST /api/auth/refresh — refresh JWT token
  app.post('/auth/refresh', async (req, reply) => {
    let decoded: { id: number; email: string; role: string };
    try {
      decoded = await req.jwtVerify<{ id: number; email: string; role: string }>();
    } catch {
      return reply.code(401).send({ error: 'Token expired or invalid' });
    }

    // Verify user still exists and is active
    const [user] = await app.db.select({
      id: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
    }).from(users).where(eq(users.id, decoded.id));

    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'Account disabled or not found' });
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });
};
