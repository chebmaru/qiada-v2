import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const qs = JSON.parse(fs.readFileSync(path.join(root, 'content/source/questions.json'), 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));

const topicTitleMap = {};
topics.forEach(t => topicTitleMap[t.topicKey] = t.titleIT);

let mismatch = 0;
let total = 0;
const mismatchByTopic = {};

qs.forEach(q => {
  if (!q.topicKey || !topicTitleMap[q.topicKey]) return;
  total++;
  const topicTitle = topicTitleMap[q.topicKey].toLowerCase();
  const qText = (q.textIT || q.textIt || '').toLowerCase();

  // Extract meaningful words from topic title (>3 chars, skip common words)
  const skipWords = new Set(['della', 'delle', 'degli', 'dello', 'nella', 'nelle', 'negli', 'nello', 'dalla', 'dalle', 'dagli', 'dallo', 'sulla', 'sulle', 'sugli', 'sullo', 'come', 'quando', 'dove', 'sono', 'essere', 'stato', 'anche', 'dopo', 'prima', 'ogni', 'altro', 'altri', 'altre', 'altra', 'quale', 'quali', 'caso', 'fase', 'modo', 'tipo', 'veicolo', 'veicoli', 'segnale', 'segnali']);
  const titleWords = topicTitle.split(/\s+/).filter(w => w.length > 3 && !skipWords.has(w));
  if (titleWords.length === 0) return;

  const matchCount = titleWords.filter(w => qText.includes(w)).length;
  const matchRatio = matchCount / titleWords.length;

  if (matchRatio === 0) {
    mismatch++;
    mismatchByTopic[q.topicKey] = (mismatchByTopic[q.topicKey] || 0) + 1;
  }
});

console.log('Total questions checked:', total);
console.log('Potential mismatches (0 keyword overlap):', mismatch);
console.log('Mismatch rate:', (mismatch/total*100).toFixed(1) + '%');
console.log('\nWorst topics (most mismatches):');
Object.entries(mismatchByTopic)
  .sort((a,b) => b[1]-a[1])
  .slice(0, 25)
  .forEach(([k,v]) => {
    const topicTotal = qs.filter(q => q.topicKey === k).length;
    console.log(`  ${v}/${topicTotal} | ${k} | ${topicTitleMap[k]}`);
  });
