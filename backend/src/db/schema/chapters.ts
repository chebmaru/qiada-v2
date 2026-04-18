import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  number: integer('number').notNull().unique(),
  nameIt: text('name_it').notNull(),
  nameAr: text('name_ar').notNull().default(''),
  coverImageUrl: text('cover_image_url'),
  ministryWeight: integer('ministry_weight').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
