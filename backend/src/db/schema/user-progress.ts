import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// Aggregated progress per topic/chapter
export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  topicKey: text('topic_key'),
  chapterId: integer('chapter_id'),
  totalQuestions: integer('total_questions').notNull().default(0),
  correctQuestions: integer('correct_questions').notNull().default(0),
  lastStudiedAt: timestamp('last_studied_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  unique('uq_user_topic').on(t.userId, t.topicKey),
  unique('uq_user_chapter').on(t.userId, t.chapterId),
]);

// Daily activity for streaks
export const userDailyActivity = pgTable('user_daily_activity', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  date: text('date').notNull(), // YYYY-MM-DD
  questionsAnswered: integer('questions_answered').notNull().default(0),
  questionsCorrect: integer('questions_correct').notNull().default(0),
  quizCount: integer('quiz_count').notNull().default(0),
  studyMinutes: integer('study_minutes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  unique('uq_user_date').on(t.userId, t.date),
]);
