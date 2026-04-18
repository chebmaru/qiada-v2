import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const questions = JSON.parse(readFileSync(join(root, 'content/source/questions.json'), 'utf-8'));
const retag = JSON.parse(readFileSync(join(root, 'content/retag-results.json'), 'utf-8'));

const changed = retag.filter(r => r.changed);
const retagMap = new Map(changed.map(r => [r.code, r.newTopic]));

console.log('Domande da aggiornare:', retagMap.size);

let updated = 0;
for (const q of questions) {
  const newTopic = retagMap.get(q.code);
  if (newTopic) {
    q.topicKey = newTopic;
    updated++;
  }
}

console.log('Aggiornate:', updated);

// Verifica: topic generici rimasti
const genericTopics = ['area_pedonale', 'continuazione', 'strada', 'carreggiata', 'corsia'];
for (const g of genericTopics) {
  const count = questions.filter(q => q.topicKey === g).length;
  console.log('  ' + g + ': ' + count + ' (prima era cestino)');
}

writeFileSync(join(root, 'content/source/questions.json'), JSON.stringify(questions, null, 2));
console.log('\nSalvato questions.json');

// Riepilogo distribuzione
const dist = {};
questions.forEach(q => { dist[q.topicKey] = (dist[q.topicKey] || 0) + 1; });
const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
console.log('\nTop 10 topic per domande (dopo retag):');
sorted.slice(0, 10).forEach(([tk, n]) => console.log('  ' + n + ' — ' + tk));
console.log('\nTopic unici usati:', Object.keys(dist).length);
