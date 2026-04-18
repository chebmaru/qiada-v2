#!/usr/bin/env node
/**
 * REBUILD TOPICS.JSON
 *
 * Legge le lezioni ORIGINALI (con topics inline) e il questions.json (già retaggato)
 * e produce topics.json definitivo con contenuto didattico preservato.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'content', 'source');

function load(file) {
  return JSON.parse(readFileSync(join(root, file), 'utf-8'));
}

// Lezioni originali con topics inline (recuperate da git)
const origLessons = load('content/lessons-original-with-topics.json');
const questions = JSON.parse(readFileSync(join(srcDir, 'questions.json'), 'utf-8'));

console.log('═══════════════════════════════════════');
console.log('  REBUILD TOPICS');
console.log('═══════════════════════════════════════\n');

// 1. Estrai tutti i topic dalle lezioni originali (con contenuto didattico)
const topicsMap = new Map();

for (const lesson of origLessons) {
  for (const topic of (lesson.topics || [])) {
    if (!topic.topicKey) continue;
    topicsMap.set(topic.topicKey, {
      topicKey: topic.topicKey,
      titleIT: topic.titleIT || '',
      titleAR: topic.titleAR || '',
      contentIT: topic.contentIT || '',
      contentAR: topic.contentAR || '',
      imageUrl: topic.imageUrl || null,
      chapterId: lesson.chapterId || null,
      lessonId: lesson.lessonId || null,
      sortOrder: topic.sortOrder || 0,
      source: 'lesson',
    });
  }
}

console.log(`Topic da lezioni (con contenuto): ${topicsMap.size}`);

// 2. Aggiungi topic usati nel quiz che non esistono nelle lezioni
const quizTopicKeys = [...new Set(questions.map(q => q.topicKey).filter(Boolean))];
let added = 0;

for (const tk of quizTopicKeys) {
  if (topicsMap.has(tk)) continue;

  // Prova a trovare un parent nelle lezioni per ereditare chapterId
  const firstQ = questions.find(q => q.topicKey === tk);

  topicsMap.set(tk, {
    topicKey: tk,
    titleIT: tk.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    titleAR: '',
    contentIT: '',
    contentAR: '',
    imageUrl: null,
    chapterId: firstQ ? firstQ.chapterId : null,
    lessonId: null,
    sortOrder: 999,
    source: 'quiz-only',
  });
  added++;
}

console.log(`Topic solo-quiz (senza contenuto lezione): ${added}`);

// 3. Conta quante domande ha ogni topic
const topicQuestionCount = {};
questions.forEach(q => {
  topicQuestionCount[q.topicKey] = (topicQuestionCount[q.topicKey] || 0) + 1;
});

// Aggiungi il conteggio
for (const topic of topicsMap.values()) {
  topic.questionCount = topicQuestionCount[topic.topicKey] || 0;
}

const topics = [...topicsMap.values()];
const withQuiz = topics.filter(t => t.questionCount > 0);
const withContent = topics.filter(t => t.contentIT && t.contentIT.trim());
const withBoth = topics.filter(t => t.questionCount > 0 && t.contentIT && t.contentIT.trim());

console.log(`\nTotale topic: ${topics.length}`);
console.log(`  Con domande quiz: ${withQuiz.length}`);
console.log(`  Con contenuto didattico: ${withContent.length}`);
console.log(`  Con entrambi: ${withBoth.length}`);
console.log(`  Solo contenuto (0 quiz): ${withContent.length - withBoth.length}`);
console.log(`  Solo quiz (0 contenuto): ${withQuiz.length - withBoth.length}`);

// 4. Salva
writeFileSync(join(srcDir, 'topics.json'), JSON.stringify(topics, null, 2));
console.log(`\n💾 Salvato: content/source/topics.json (${topics.length} topic)`);

// 5. Verifica lessons.json semplificato è coerente
const lessons = JSON.parse(readFileSync(join(srcDir, 'lessons.json'), 'utf-8'));
const lessonsHaveRefs = lessons.every(l => Array.isArray(l.topicKeys));
if (lessonsHaveRefs) {
  console.log('✅ lessons.json ha topicKeys[] refs');
} else {
  // Rigenera lessons semplificato
  const cleanLessons = origLessons.map(l => ({
    lessonId: l.lessonId,
    chapterId: l.chapterId,
    titleIT: l.titleIT,
    titleAR: l.titleAR || '',
    contentIT: l.contentIT || '',
    contentAR: l.contentAR || '',
    sortOrder: l.sortOrder || 0,
    durationSeconds: l.durationSeconds || 0,
    cdnUrl: l.cdnUrl || null,
    topicKeys: (l.topics || []).map(t => t.topicKey).filter(Boolean),
  }));
  writeFileSync(join(srcDir, 'lessons.json'), JSON.stringify(cleanLessons, null, 2));
  console.log('✅ lessons.json rigenerato con topicKeys[]');
}

// 6. Campione
console.log('\n─── CAMPIONE: 5 topic con quiz + contenuto ───');
withBoth.sort(() => Math.random() - 0.5).slice(0, 5).forEach(t => {
  console.log(`  ${t.topicKey} (Cap ${t.chapterId}) — ${t.questionCount} domande`);
  console.log(`    IT: ${t.titleIT}`);
  console.log(`    Contenuto: ${(t.contentIT || '').slice(0, 80)}...`);
});

console.log('\n═══════════════════════════════════════');
