import { readFileSync } from 'fs';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
import * as schema from './schema/index.js';

const contentDir = resolve(import.meta.dirname, '../../../content/source');

function loadJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(contentDir, file), 'utf-8'));
}

interface ChapterJson {
  id: number; number?: number; nameIT: string; nameAR?: string;
  coverImageUrl?: string; ministryWeight?: number; questionCount?: number;
}
interface LessonJson {
  lessonId: string; chapterId: number; titleIT: string; titleAR?: string;
  contentIT?: string; contentAR?: string; sortOrder?: number;
  durationSeconds?: number; cdnUrl?: string; topicKeys?: string[];
}
interface TopicJson {
  topicKey: string; titleIT: string; titleAR?: string;
  contentIT?: string; contentAR?: string; imageUrl?: string;
  chapterId?: number; lessonId?: string; sortOrder?: number;
  questionCount?: number;
}
interface QuestionJson {
  code: string; textIT: string; textAR: string;
  explanationIT?: string; explanationAR?: string;
  isTrue: boolean; imageUrl?: string;
  chapterId: number; topicKey: string;
}
interface GlossaryJson {
  termIT: string; termAR?: string;
  definitionIT?: string; definitionAR?: string;
  category?: string;
}

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

  const client = postgres(dbUrl);
  const db = drizzle(client, { schema });

  console.log('═══════════════════════════════════════');
  console.log('  SEED DATABASE QIADA V2');
  console.log('═══════════════════════════════════════\n');

  // Load content
  const chaptersData = loadJson<ChapterJson[]>('chapters.json');
  const lessonsData = loadJson<LessonJson[]>('lessons.json');
  const topicsData = loadJson<TopicJson[]>('topics.json');
  const questionsData = loadJson<QuestionJson[]>('questions.json');
  const glossaryData = loadJson<GlossaryJson[]>('glossary.json');

  console.log(`Loaded: ${chaptersData.length} chapters, ${lessonsData.length} lessons, ${topicsData.length} topics, ${questionsData.length} questions, ${glossaryData.length} glossary\n`);

  // Clear tables (reverse FK order) + reset sequences
  console.log('Clearing tables...');
  await db.delete(schema.userQuestionStats);
  await db.delete(schema.userProgress);
  await db.delete(schema.userDailyActivity);
  await db.delete(schema.quizAttempts);
  await db.delete(schema.questionTopics);
  await db.delete(schema.questions);
  await db.delete(schema.topics);
  await db.delete(schema.lessons);
  await db.delete(schema.glossary);
  await db.delete(schema.chapters);
  // Reset serial sequences so IDs start from 1
  await db.execute(sql`ALTER SEQUENCE chapters_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE questions_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE topics_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE glossary_id_seq RESTART WITH 1`);

  // 1. Chapters
  console.log('Seeding chapters...');
  const chapterRows = chaptersData.map(c => ({
    number: c.number || c.id,
    nameIt: c.nameIT,
    nameAr: c.nameAR || '',
    coverImageUrl: c.coverImageUrl || null,
    ministryWeight: c.ministryWeight || 0,
  }));
  const insertedChapters = await db.insert(schema.chapters).values(chapterRows).returning();
  // Map chapter number → DB id
  const chapterIdMap = new Map(insertedChapters.map(c => [c.number, c.id]));
  console.log(`  ✅ ${insertedChapters.length} chapters`);

  // 2. Lessons
  console.log('Seeding lessons...');
  const lessonRows = lessonsData.map(l => ({
    id: l.lessonId,
    chapterId: chapterIdMap.get(l.chapterId) || 1,
    titleIt: l.titleIT,
    titleAr: l.titleAR || '',
    contentIt: l.contentIT || '',
    contentAr: l.contentAR || '',
    sortOrder: l.sortOrder || 0,
    durationSeconds: l.durationSeconds || 0,
    cdnUrl: l.cdnUrl || null,
  }));
  await db.insert(schema.lessons).values(lessonRows);
  // Map lessonId string → DB id (same since we use UUID)
  const lessonIdSet = new Set(lessonsData.map(l => l.lessonId));
  console.log(`  ✅ ${lessonRows.length} lessons`);

  // 3. Topics
  console.log('Seeding topics...');
  const topicRows = topicsData.map(t => ({
    topicKey: t.topicKey,
    titleIt: t.titleIT,
    titleAr: t.titleAR || '',
    contentIt: t.contentIT || '',
    contentAr: t.contentAR || '',
    imageUrl: t.imageUrl || null,
    chapterId: t.chapterId ? (chapterIdMap.get(t.chapterId) || null) : null,
    lessonId: (t.lessonId && lessonIdSet.has(t.lessonId)) ? t.lessonId : null,
    sortOrder: t.sortOrder || 0,
    questionCount: t.questionCount || 0,
  }));
  const insertedTopics = await db.insert(schema.topics).values(topicRows).returning();
  // Map topicKey → DB id
  const topicIdMap = new Map(insertedTopics.map(t => [t.topicKey, t.id]));
  console.log(`  ✅ ${insertedTopics.length} topics`);

  // 4. Glossary
  console.log('Seeding glossary...');
  const glossaryRows = glossaryData.map(g => ({
    termIt: g.termIT,
    termAr: g.termAR || '',
    definitionIt: g.definitionIT || '',
    definitionAr: g.definitionAR || '',
    category: g.category || null,
  }));
  await db.insert(schema.glossary).values(glossaryRows);
  console.log(`  ✅ ${glossaryRows.length} glossary terms`);

  // 5. Questions (batch insert 500 at a time)
  console.log('Seeding questions...');
  const BATCH = 500;
  const questionIdMap = new Map<string, number>(); // code → DB id
  let qInserted = 0;

  for (let i = 0; i < questionsData.length; i += BATCH) {
    const batch = questionsData.slice(i, i + BATCH);
    const rows = batch.map(q => ({
      code: q.code,
      textIt: q.textIT,
      textAr: q.textAR,
      explanationIt: q.explanationIT || '',
      explanationAr: q.explanationAR || '',
      isTrue: q.isTrue,
      imageUrl: q.imageUrl || null,
      chapterId: chapterIdMap.get(q.chapterId) || 1,
      topicKey: q.topicKey,
    }));
    const inserted = await db.insert(schema.questions).values(rows).returning({ id: schema.questions.id, code: schema.questions.code });
    for (const row of inserted) {
      questionIdMap.set(row.code, row.id);
    }
    qInserted += inserted.length;
    process.stdout.write(`  ${qInserted}/${questionsData.length}\r`);
  }
  console.log(`  ✅ ${qInserted} questions`);

  // 6. Question-Topics M2M
  console.log('Seeding question_topics M2M...');
  let m2mInserted = 0;
  let m2mSkipped = 0;

  for (let i = 0; i < questionsData.length; i += BATCH) {
    const batch = questionsData.slice(i, i + BATCH);
    const m2mRows: { questionId: number; topicId: number }[] = [];

    for (const q of batch) {
      const qId = questionIdMap.get(q.code);
      const tId = topicIdMap.get(q.topicKey);
      if (qId && tId) {
        m2mRows.push({ questionId: qId, topicId: tId });
      } else {
        m2mSkipped++;
      }
    }

    if (m2mRows.length > 0) {
      await db.insert(schema.questionTopics).values(m2mRows);
      m2mInserted += m2mRows.length;
    }
    process.stdout.write(`  ${m2mInserted}/${questionsData.length}\r`);
  }
  console.log(`  ✅ ${m2mInserted} M2M links (${m2mSkipped} skipped — topic not found)`);

  // ═══ VALIDATION ═══
  console.log('\n═══════════════════════════════════════');
  console.log('  VALIDATION');
  console.log('═══════════════════════════════════════');

  const counts = {
    chapters: (await db.select({ count: sql<number>`count(*)` }).from(schema.chapters))[0].count,
    lessons: (await db.select({ count: sql<number>`count(*)` }).from(schema.lessons))[0].count,
    topics: (await db.select({ count: sql<number>`count(*)` }).from(schema.topics))[0].count,
    questions: (await db.select({ count: sql<number>`count(*)` }).from(schema.questions))[0].count,
    questionTopics: (await db.select({ count: sql<number>`count(*)` }).from(schema.questionTopics))[0].count,
    glossary: (await db.select({ count: sql<number>`count(*)` }).from(schema.glossary))[0].count,
  };

  let errors = 0;
  function check(name: string, actual: number, expected: number) {
    if (Number(actual) === expected) {
      console.log(`  ✅ ${name}: ${actual}`);
    } else {
      console.log(`  ❌ ${name}: ${actual} (expected ${expected})`);
      errors++;
    }
  }

  check('chapters', counts.chapters, chaptersData.length);
  check('lessons', counts.lessons, lessonsData.length);
  check('topics', counts.topics, topicsData.length);
  check('questions', counts.questions, questionsData.length);
  check('glossary', counts.glossary, glossaryData.length);
  console.log(`  ℹ️  question_topics M2M: ${counts.questionTopics}`);

  // Random sample
  console.log('\n─── CAMPIONE: 3 domande random dal DB ───');
  const sample = await db.select().from(schema.questions).orderBy(sql`random()`).limit(3);
  for (const q of sample) {
    console.log(`  [${q.code}] ${q.isTrue ? 'VERO' : 'FALSO'} — topic=${q.topicKey}`);
    console.log(`    IT: ${q.textIt.slice(0, 80)}...`);
    console.log(`    AR: ${q.textAr.slice(0, 80)}...`);
  }

  console.log('\n═══════════════════════════════════════');
  if (errors > 0) {
    console.log(`  ❌ FAIL — ${errors} errors`);
    process.exit(1);
  } else {
    console.log('  ✅ SEED PASS — database pronto');
  }
  console.log('═══════════════════════════════════════');

  await client.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
