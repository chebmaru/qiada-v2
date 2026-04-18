import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { chapters } from './chapters.js';

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  textIt: text('text_it').notNull(),
  textAr: text('text_ar').notNull(),
  explanationIt: text('explanation_it').default(''),
  explanationAr: text('explanation_ar').default(''),
  isTrue: boolean('is_true').notNull(),
  imageUrl: text('image_url'),
  chapterId: integer('chapter_id').notNull().references(() => chapters.id),
  topicKey: text('topic_key').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
