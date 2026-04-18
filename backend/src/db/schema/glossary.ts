import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const glossary = pgTable('glossary', {
  id: serial('id').primaryKey(),
  termIt: text('term_it').notNull(),
  termAr: text('term_ar').notNull().default(''),
  definitionIt: text('definition_it').default(''),
  definitionAr: text('definition_ar').default(''),
  category: text('category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
