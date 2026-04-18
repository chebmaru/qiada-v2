import { pgTable, integer, primaryKey } from 'drizzle-orm/pg-core';
import { questions } from './questions.js';
import { topics } from './topics.js';

export const questionTopics = pgTable('question_topics', {
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  topicId: integer('topic_id').notNull().references(() => topics.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.questionId, t.topicId] }),
]);
