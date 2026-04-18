import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const accessCodes = pgTable('access_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  durationMinutes: integer('duration_minutes').notNull(), // durata del pacchetto
  activatedAt: timestamp('activated_at'), // null = non ancora attivato
  expiresAt: timestamp('expires_at'), // calcolato: activatedAt + durationMinutes
  userId: integer('user_id').references(() => users.id),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
