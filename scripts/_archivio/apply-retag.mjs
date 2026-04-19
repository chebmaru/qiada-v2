/**
 * Apply retagged topicKeys to:
 * 1. content/source/questions.json (backup first)
 * 2. PostgreSQL DB: questions.topic_key + question_topics M2M + topics.question_count
 *
 * Reads from: scripts/output/retag-progress.json (code → topicKey map)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ── Load data ──
const progressFile = path.join(root, 'scripts/output/retag-progress.json');
const questionsFile = path.join(root, 'content/source/questions.json');

if (!fs.existsSync(progressFile)) {
  console.error('ERROR: retag-progress.json not found. Run retag-all-questions.mjs first.');
  process.exit(1);
}

const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
const retagMap = progress.results; // { code: topicKey }
const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));

const validTopicKeys = new Set(topics.map(t => t.topicKey));

console.log('=== APPLY RETAG ===');
console.log(`Retag entries: ${Object.keys(retagMap).length}`);
console.log(`Questions in file: ${questions.length}`);
console.log(`Valid topics: ${validTopicKeys.size}`);

// ── Step 1: Validate ──
let valid = 0, invalid = 0, missing = 0, changed = 0, unchanged = 0;
const invalidEntries = [];

for (const [code, topicKey] of Object.entries(retagMap)) {
  if (validTopicKeys.has(topicKey)) {
    valid++;
  } else {
    invalid++;
    invalidEntries.push({ code, topicKey });
  }
}

console.log(`\nValidation: ${valid} valid, ${invalid} invalid topicKeys`);
if (invalidEntries.length > 0) {
  console.log('Invalid topicKeys (first 20):');
  invalidEntries.slice(0, 20).forEach(e => console.log(`  ${e.code} → ${e.topicKey}`));
}

// ── Step 2: Update questions.json ──
console.log('\n--- Updating questions.json ---');

// Backup
const backupPath = path.join(root, 'content/source/questions-pre-retag-backup.json');
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, JSON.stringify(questions, null, 2), 'utf-8');
  console.log(`Backup saved: ${backupPath}`);
} else {
  console.log('Backup already exists, skipping');
}

for (const q of questions) {
  const newTopic = retagMap[q.code];
  if (!newTopic) {
    missing++;
    continue;
  }
  if (!validTopicKeys.has(newTopic)) continue; // skip invalid

  if (q.topicKey !== newTopic) {
    q.topicKey = newTopic;
    changed++;
  } else {
    unchanged++;
  }
}

console.log(`Changed: ${changed}, Unchanged: ${unchanged}, Missing from retag: ${missing}`);

// Save updated questions
fs.writeFileSync(questionsFile, JSON.stringify(questions, null, 2), 'utf-8');
console.log('Saved questions.json');

// Distribution check
const dist = {};
questions.forEach(q => { dist[q.topicKey] = (dist[q.topicKey] || 0) + 1; });
const emptyTopics = [...validTopicKeys].filter(k => !dist[k] && k !== 'na_dipende');
console.log(`\nTopics with questions: ${Object.keys(dist).length}`);
console.log(`Topics still empty: ${emptyTopics.length}`);
if (emptyTopics.length > 0 && emptyTopics.length <= 20) {
  emptyTopics.forEach(k => console.log(`  EMPTY: ${k}`));
}

// ── Step 3: Update DB ──
console.log('\n--- Updating PostgreSQL ---');

const dbUrl = process.env.DATABASE_URL ||
  fs.readFileSync(path.join(root, '.env'), 'utf-8').match(/DATABASE_URL=(.+)/)?.[1]?.trim();

if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  await client.query('BEGIN');

  // 3a. Update topic_key on questions table
  console.log('Updating questions.topic_key...');
  let dbUpdated = 0;
  for (const q of questions) {
    const newTopic = retagMap[q.code];
    if (!newTopic || !validTopicKeys.has(newTopic)) continue;

    const res = await client.query(
      'UPDATE questions SET topic_key = $1, updated_at = NOW() WHERE code = $2 AND topic_key != $1',
      [newTopic, q.code]
    );
    dbUpdated += res.rowCount;
  }
  console.log(`DB questions updated: ${dbUpdated}`);

  // 3b. Rebuild question_topics M2M
  console.log('Rebuilding question_topics M2M...');
  await client.query('DELETE FROM question_topics');

  const insertRes = await client.query(`
    INSERT INTO question_topics (question_id, topic_id)
    SELECT q.id, t.id
    FROM questions q
    JOIN topics t ON t.topic_key = q.topic_key
    ON CONFLICT DO NOTHING
  `);
  console.log(`M2M rows inserted: ${insertRes.rowCount}`);

  // 3c. Update question_count on topics
  console.log('Updating topics.question_count...');
  await client.query(`
    UPDATE topics SET question_count = sub.cnt
    FROM (
      SELECT t.id, COUNT(qt.question_id) as cnt
      FROM topics t
      LEFT JOIN question_topics qt ON qt.topic_id = t.id
      GROUP BY t.id
    ) sub
    WHERE topics.id = sub.id
  `);

  // Verify
  const topicStats = await client.query(`
    SELECT COUNT(*) as total_topics,
           SUM(CASE WHEN question_count > 0 THEN 1 ELSE 0 END) as with_questions,
           SUM(CASE WHEN question_count = 0 THEN 1 ELSE 0 END) as empty
    FROM topics
  `);
  console.log('Topic stats:', topicStats.rows[0]);

  const qtCount = await client.query('SELECT COUNT(*) as cnt FROM question_topics');
  console.log(`question_topics rows: ${qtCount.rows[0].cnt}`);

  await client.query('COMMIT');
  console.log('DB transaction committed');

  // ── SAMPLE 5 random changed ──
  console.log('\n=== SAMPLE (5 changed topics) ===');
  const sample = await client.query(`
    SELECT t.topic_key, t.title_it, t.question_count
    FROM topics t
    WHERE t.question_count > 0
    ORDER BY RANDOM()
    LIMIT 5
  `);
  sample.rows.forEach(r => console.log(`  ${r.question_count} questions — ${r.topic_key} (${r.title_it})`));

  // ── VERDICT ──
  const coverage = Object.keys(retagMap).length / questions.length;
  if (coverage >= 0.95 && invalid <= 50) {
    console.log('\n✅ VERDICT: PASS — Retag applied successfully');
  } else {
    console.log(`\n⚠️ VERDICT: PARTIAL — Coverage ${(coverage*100).toFixed(1)}%, ${invalid} invalid`);
  }

} catch (err) {
  await client.query('ROLLBACK');
  console.error('ROLLBACK:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
