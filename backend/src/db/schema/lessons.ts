import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chapters } from './chapters.js';

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id),
  titleIt: text('title_it').notNull(),
  titleAr: text('title_ar').notNull().default(''),
  contentIt: text('content_it').default(''),
  contentAr: text('content_ar').default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  cdnUrl: text('cdn_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
