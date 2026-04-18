import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const quizAttempts = pgTable('quiz_attempts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  mode: text('mode').notNull().default('exam'), // exam | practice | topic
  totalQuestions: integer('total_questions').notNull().default(40),
  correctCount: integer('correct_count'),
  wrongCount: integer('wrong_count'),
  score: integer('score'), // percentage 0-100
  passed: boolean('passed'),
  durationSeconds: integer('duration_seconds'),
  chapterId: integer('chapter_id'),
  topicKey: text('topic_key'),
  // Snapshot: question IDs + answers at submission time
  snapshot: jsonb('snapshot'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  submittedAt: timestamp('submitted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
