import { pgTable, serial, integer, real, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { questions } from './questions.js';

// SM-2 per-question stats for each user
export const userQuestionStats = pgTable('user_question_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  questionId: integer('question_id').notNull().references(() => questions.id),
  // SM-2 fields
  easeFactor: real('ease_factor').notNull().default(2.5),
  interval: integer('interval').notNull().default(0), // days
  repetitions: integer('repetitions').notNull().default(0),
  nextReviewAt: timestamp('next_review_at'),
  // Stats
  timesCorrect: integer('times_correct').notNull().default(0),
  timesWrong: integer('times_wrong').notNull().default(0),
  lastAnsweredAt: timestamp('last_answered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  unique('uq_user_question').on(t.userId, t.questionId),
]);
