/**
 * Apply DeepSeek translations to topics.json
 * Merges titleAR, contentIT, contentAR into existing topics
 *
 * Usage: node scripts/apply-topic-translations.js
 */

const fs = require('fs');
const path = require('path');

const TOPICS_PATH = path.join(__dirname, '../content/source/topics.json');
const TRANSLATED_PATH = path.join(__dirname, 'output/topics-translated.json');

const topics = JSON.parse(fs.readFileSync(TOPICS_PATH, 'utf8'));
const translated = JSON.parse(fs.readFileSync(TRANSLATED_PATH, 'utf8'));

console.log(`Topics: ${topics.length}`);
console.log(`Translations: ${translated.length}`);

// Build lookup
const lookup = new Map();
for (const t of translated) {
  lookup.set(t.topicKey, t);
}

let updated = 0;
let skipped = 0;
const issues = [];

for (const topic of topics) {
  const tr = lookup.get(topic.topicKey);
  if (!tr) continue;

  // Only update empty fields
  if (!topic.titleAR && tr.titleAR) {
    topic.titleAR = tr.titleAR;
  }
  if (!topic.contentIT && tr.contentIT) {
    topic.contentIT = tr.contentIT;
  }
  if (!topic.contentAR && tr.contentAR) {
    topic.contentAR = tr.contentAR;
  }

  // Validate
  if (!topic.titleAR) issues.push(`EMPTY titleAR after merge: ${topic.topicKey}`);
  if (!topic.contentIT) issues.push(`EMPTY contentIT after merge: ${topic.topicKey}`);
  if (!topic.contentAR) issues.push(`EMPTY contentAR after merge: ${topic.topicKey}`);

  // Check eastern numerals
  const eastern = /[٠-٩]/;
  if (eastern.test(topic.titleAR || '') || eastern.test(topic.contentAR || '')) {
    issues.push(`EASTERN NUMERALS in: ${topic.topicKey}`);
    topic.titleAR = (topic.titleAR || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString());
    topic.contentAR = (topic.contentAR || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString());
  }

  updated++;
}

// QA
const stillMissing = topics.filter(t => !t.titleAR || !t.contentIT || !t.contentAR);

console.log(`\n=== RESULTS ===`);
console.log(`Updated: ${updated}`);
console.log(`Still missing translations: ${stillMissing.length}`);

// Sample 3 random updated
console.log('\nCAMPIONE 3 random:');
const updatedTopics = topics.filter(t => lookup.has(t.topicKey));
const shuffled = [...updatedTopics].sort(() => Math.random() - 0.5);
shuffled.slice(0, 3).forEach(t => {
  console.log(`  ${t.topicKey}:`);
  console.log(`    titleAR: ${t.titleAR}`);
  console.log(`    contentIT: ${(t.contentIT || '').substring(0, 80)}...`);
  console.log(`    contentAR: ${(t.contentAR || '').substring(0, 80)}...`);
});

if (issues.length > 0) {
  console.log(`\nISSUES (${issues.length}):`);
  issues.forEach(i => console.log(`  - ${i}`));
}

if (stillMissing.length > 0) {
  console.log(`\nVERDICT: FAIL — ${stillMissing.length} topics still missing`);
  stillMissing.forEach(t => console.log(`  - ${t.topicKey}`));
} else {
  console.log('\nVERDICT: PASS — all 393 topics have complete translations');
  // Save
  fs.writeFileSync(TOPICS_PATH, JSON.stringify(topics, null, 2), 'utf8');
  console.log(`Saved to ${TOPICS_PATH}`);
}
