import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const progress = JSON.parse(fs.readFileSync(path.join(root, 'scripts/output/retag-progress.json'), 'utf-8'));
const qs = JSON.parse(fs.readFileSync(path.join(root, 'content/source/questions.json'), 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));

const validTopicKeys = new Set(topics.map(t => t.topicKey));

// Find missing
const missing = qs.filter(q => !progress.results[q.code]);
console.log('Missing questions:', missing.length);

// Check inquinamento topics
const inqTopics = topics.filter(t =>
  t.topicKey.includes('inquinamento') || t.topicKey.includes('ambiente') ||
  t.topicKey.includes('emissioni') || t.topicKey.includes('ecolog')
);
console.log('\nTopics related to pollution/environment:');
inqTopics.forEach(t => console.log(`  ${t.topicKey} | ${t.titleIT}`));

// Sample missing
console.log('\nFirst 5 missing:');
missing.slice(0, 5).forEach(q => {
  console.log(`\n${q.code}: "${q.textIT.substring(0, 150)}"`);
  console.log(`  Current topicKey: ${q.topicKey}`);
  console.log(`  ChapterId: ${q.chapterId}`);
});

// Try to find the right topic for "riduzione inquinamento" questions
// These are about reducing pollution - look for closest topic
const pollutionTopics = topics.filter(t => {
  const title = t.titleIT.toLowerCase();
  return title.includes('inquinamento') || title.includes('ambiente') ||
         title.includes('emissioni') || title.includes('ecolog') ||
         title.includes('ridurre') || title.includes('rumore');
});
console.log('\nAll pollution/environment related topics:');
pollutionTopics.forEach(t => console.log(`  ${t.topicKey} | ch${t.chapterId} | ${t.titleIT}`));

// Check chapter 25 topics (most missing are B25xxx)
const ch25Topics = topics.filter(t => t.chapterId === 25);
console.log('\nChapter 25 topics:');
ch25Topics.forEach(t => console.log(`  ${t.topicKey} | ${t.titleIT}`));

// Assign missing questions to best match
let fixed = 0;
for (const q of missing) {
  const text = q.textIT.toLowerCase();

  // Try keyword matching
  let bestTopic = null;

  if (text.includes('inquinamento') || text.includes('emissioni') || text.includes('gas di scarico') || text.includes('catalizzatore') || text.includes('marmitta')) {
    // Find pollution-related topic
    bestTopic = topics.find(t => t.topicKey.includes('inquinamento') && validTopicKeys.has(t.topicKey));
    if (!bestTopic) bestTopic = topics.find(t => t.titleIT.toLowerCase().includes('inquinamento') && validTopicKeys.has(t.topicKey));
  }

  if (!bestTopic) {
    // Keep original topic
    progress.results[q.code] = q.topicKey;
    console.log(`  ${q.code}: kept original → ${q.topicKey}`);
  } else {
    progress.results[q.code] = bestTopic.topicKey;
    console.log(`  ${q.code}: assigned → ${bestTopic.topicKey}`);
  }
  fixed++;
}

console.log(`\nFixed: ${fixed}`);
console.log(`Total results now: ${Object.keys(progress.results).length}`);

// Save updated progress
fs.writeFileSync(
  path.join(root, 'scripts/output/retag-progress.json'),
  JSON.stringify(progress, null, 2),
  'utf-8'
);
console.log('Saved updated progress');
