import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const r = JSON.parse(readFileSync(join(root, 'content/retag-results.json'), 'utf-8'));
const t = JSON.parse(readFileSync(join(root, 'content/source/topics.json'), 'utf-8'));
const q = JSON.parse(readFileSync(join(root, 'content/source/questions.json'), 'utf-8'));

const changed = r.filter(x => x.changed);
const topicSet = new Set(t.map(x => x.topicKey));

// Topic inesistenti
const invalid = changed.filter(x => !topicSet.has(x.newTopic));
console.log('Topic inesistenti assegnati:', invalid.length);
if (invalid.length > 0) {
  invalid.slice(0, 10).forEach(x => console.log('  ' + x.code + ' → ' + x.newTopic));
}

// 20 campioni random
console.log('\n─── 20 CAMBIAMENTI RANDOM ───');
const shuffled = [...changed].sort(() => Math.random() - 0.5);
for (const s of shuffled.slice(0, 20)) {
  const qn = q.find(x => x.code === s.code);
  const topicTitle = t.find(x => x.topicKey === s.newTopic)?.titleIT || '???';
  console.log();
  console.log('[' + s.code + '] ' + s.oldTopic + ' → ' + s.newTopic + ' (' + topicTitle + ')');
  console.log('  "' + (qn?.textIT || '').slice(0, 120) + '"');
  console.log('  Motivo: ' + s.reason);
}

// Topic prima vuoti ora con domande
const quizTopicSet = new Set(q.map(x => x.topicKey));
const oldOrphans = t.filter(tp => !quizTopicSet.has(tp.topicKey)).map(tp => tp.topicKey);
const newlyFilled = oldOrphans.filter(tk => changed.some(c => c.newTopic === tk));
console.log('\n─── TOPIC PRIMA VUOTI ORA CON DOMANDE: ' + newlyFilled.length + ' ───');
newlyFilled.forEach(tk => {
  const count = changed.filter(c => c.newTopic === tk).length;
  const title = t.find(x => x.topicKey === tk)?.titleIT || '';
  console.log('  ' + tk + ' (' + title + '): +' + count + ' domande');
});
