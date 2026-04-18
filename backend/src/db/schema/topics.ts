import { pgTable, serial, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chapters } from './chapters.js';
import { lessons } from './lessons.js';

export const topics = pgTable('topics', {
  id: serial('id').primaryKey(),
  topicKey: text('topic_key').notNull().unique(),
  titleIt: text('title_it').notNull(),
  titleAr: text('title_ar').notNull().default(''),
  contentIt: text('content_it').default(''),
  contentAr: text('content_ar').default(''),
  imageUrl: text('image_url'),
  chapterId: integer('chapter_id').references(() => chapters.id),
  lessonId: uuid('lesson_id').references(() => lessons.id),
  sortOrder: integer('sort_order').notNull().default(0),
  questionCount: integer('question_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
