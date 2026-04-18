import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const q = JSON.parse(readFileSync(join(root, 'content/source/questions.json'), 'utf-8'));
const l = JSON.parse(readFileSync(join(root, 'content/source/lessons.json'), 'utf-8'));

// TopicKey nelle lezioni
const lessonTopics = new Map();
for (const lesson of l) {
  for (const topic of (lesson.topics || [])) {
    if (topic.topicKey) {
      lessonTopics.set(topic.topicKey, { lesson: lesson.titleIT, titleIT: topic.titleIT, chapterId: lesson.chapterId });
    }
  }
}

// TopicKey orfani
const quizTopics = [...new Set(q.map(x => x.topicKey))];
const orphans = quizTopics.filter(tk => {
  return lessonTopics.has(tk) === false;
});

console.log('14 TOPICKEY ORFANI — ANALISI');
console.log('═══════════════════════════════════════');

for (const tk of orphans) {
  const questions = q.filter(x => x.topicKey === tk);
  const chapters = [...new Set(questions.map(x => x.chapterId))];
  const withImg = questions.filter(x => x.imageUrl);

  console.log('');
  console.log(`${tk}`);
  console.log(`  Domande: ${questions.length} | Capitoli: ${chapters} | Con foto: ${withImg.length}`);
  console.log(`  Esempio: ${questions[0].textIT.slice(0, 100)}...`);

  // Cerco topic simili nelle lezioni
  const parts = tk.split('_');
  const similar = [...lessonTopics.entries()].filter(([ltk]) => {
    return parts.some(p => p.length > 3 && ltk.includes(p));
  }).slice(0, 3);

  if (similar.length > 0) {
    console.log('  Candidati mapping:');
    similar.forEach(([ltk, info]) => console.log(`    → ${ltk} (${info.lesson})`));
  } else {
    console.log('  ⚠️  Nessun topic simile trovato');
  }
}

// Lezioni senza quiz
console.log('\n');
console.log('55 TOPIC LEZIONE SENZA QUIZ');
console.log('═══════════════════════════════════════');
const quizTopicSet = new Set(quizTopics);
const lessonOrphans = [...lessonTopics.entries()].filter(([tk]) => {
  return quizTopicSet.has(tk) === false;
});
for (const [tk, info] of lessonOrphans) {
  console.log(`  ${tk} — ${info.lesson}`);
}
