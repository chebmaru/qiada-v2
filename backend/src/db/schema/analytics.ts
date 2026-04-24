import { pgTable, serial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),             // null for anonymous
  event: text('event').notNull(),          // pageview, quiz_start, quiz_complete, login, register
  path: text('path'),                      // /it/quiz, /ar/topics/segnali, etc.
  metadata: jsonb('metadata'),             // flexible: { chapterId, score, duration, referrer, userAgent, ... }
  ip: text('ip'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
