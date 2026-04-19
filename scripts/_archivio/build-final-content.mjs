#!/usr/bin/env node
/**
 * BUILD FINAL CONTENT
 *
 * Prende i file raw e produce il dataset DEFINITIVO per il seed DB.
 * Dopo questo script, content/source/ contiene la verità. Punto.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'content', 'source');
const enrichDir = join(root, 'content', 'enriched');

function load(dir, file) {
  return JSON.parse(readFileSync(join(dir, file), 'utf-8'));
}
function save(dir, file, data) {
  writeFileSync(join(dir, file), JSON.stringify(data, null, 2));
}

const questions = load(srcDir, 'questions.json');
const chapters = load(srcDir, 'chapters.json');
const lessons = load(srcDir, 'lessons.json');
const glossary = load(srcDir, 'glossary.json');
const signDescs = load(enrichDir, 'signs-descriptions.json');

console.log('═══════════════════════════════════════');
console.log('  BUILD FINAL CONTENT');
console.log('═══════════════════════════════════════\n');

// ═══════════════════════════════════════
// 1. ESTRARRE TOPICS COME ENTITÀ INDIPENDENTE
// ═══════════════════════════════════════
console.log('📌 1. Estrazione topics come entità indipendente');

const topicsMap = new Map(); // topicKey → topic object

// Prima: prendi tutti i topic dalle lezioni (hanno contenuto didattico)
for (const lesson of lessons) {
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

// Poi: aggiungi i 14 orfani dal quiz (topic che esistono nel quiz ma non nelle lezioni)
const quizTopicKeys = [...new Set(questions.map(q => q.topicKey).filter(Boolean))];
const orphanMapping = {
  'strettoia_asimmetrica_a_destra': 'strettoia_simmetrica',
  'strettoia_asimmetrica_a_sinistra': 'strettoia_simmetrica',
  'attraversamento_ciclabile': 'attraversamento_pedonale',
  'salita_ripida': 'discesa_pericolosa_e',
  'animali_domestici_vaganti': 'animali_domestici',
  'caduta_massi_da_destra': 'caduta_massi',
  'semaforo_verticale': 'la_luce_rossa_del_semaforo_e',
  'divieto_di_sosta': 'divieto_di_transito',
  'dosso_artificiale': 'dosso',
  'passaggio_a_livello_con_barriere': 'passaggio_a_livello_con_barriere_o_semibarriere',
  'dare_precedenza_nei_sensi_unici_alternati': 'dare_precedenza',
  'rotatoria': 'rotatoria_e',
  'discesa_pericolosa': 'discesa_pericolosa_e',
  'altri_pericoli': 'altri_pericoli_e',
};

let orphansCreated = 0;
let orphansMapped = 0;

for (const tk of quizTopicKeys) {
  if (topicsMap.has(tk)) continue;

  // Cerco un parent nelle lezioni
  const parentKey = orphanMapping[tk];
  const parent = parentKey ? topicsMap.get(parentKey) : null;

  if (parent) {
    // Creo il topic prendendo il chapterId dal parent
    topicsMap.set(tk, {
      topicKey: tk,
      titleIT: tk.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      titleAR: '',
      contentIT: '',
      contentAR: '',
      imageUrl: null,
      chapterId: parent.chapterId,
      lessonId: parent.lessonId,
      sortOrder: 999,
      source: 'quiz-orphan-mapped',
      mappedTo: parentKey,
    });
    orphansMapped++;
  } else {
    // Prendo chapterId dalla prima domanda
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
      source: 'quiz-orphan-new',
    });
    orphansCreated++;
  }
}

const topics = [...topicsMap.values()];
console.log(`  Topic totali: ${topics.length}`);
console.log(`  Da lezioni: ${topics.filter(t => t.source === 'lesson').length}`);
console.log(`  Orfani mappati: ${orphansMapped}`);
console.log(`  Orfani nuovi: ${orphansCreated}`);

// ═══════════════════════════════════════
// 2. PULIRE QUESTIONS
// ═══════════════════════════════════════
console.log('\n📋 2. Pulizia questions');

// Accorciare topicKey > 60 chars
const shortKeyMap = {
  'pannelli_posteriori_per_autoveicoli_adibiti_al_trasporto_di_cose_di_massa_a_pieno_carico': 'pannelli_posteriori_trasporto_cose',
  'preavviso_di_deviazione_obbligatoria_per_autocarri_in_transito': 'preavviso_deviazione_autocarri',
  'se_si_stanno_seguendo_terapie_cure_con_farmaci_ad_azione_sedativa': 'terapie_farmaci_sedativi',
};

// Trova gli altri > 60
for (const q of questions) {
  if (q.topicKey && q.topicKey.length > 60 && !shortKeyMap[q.topicKey]) {
    // Auto-shorten: prendi le prime parole significative
    const words = q.topicKey.split('_').filter(w => w.length > 2);
    const short = words.slice(0, 5).join('_');
    if (short.length <= 60) {
      shortKeyMap[q.topicKey] = short;
    }
  }
}

let shortened = 0;
for (const q of questions) {
  if (shortKeyMap[q.topicKey]) {
    const oldKey = q.topicKey;
    q.topicKey = shortKeyMap[q.topicKey];
    shortened++;
  }
}

// Aggiorna anche i topics
for (const [oldKey, newKey] of Object.entries(shortKeyMap)) {
  if (topicsMap.has(oldKey)) {
    const topic = topicsMap.get(oldKey);
    topic.topicKey = newKey;
    topicsMap.delete(oldKey);
    topicsMap.set(newKey, topic);
  }
}

console.log(`  TopicKey accorciati: ${shortened} domande`);
console.log(`  Mapping: ${Object.entries(shortKeyMap).map(([o,n]) => o.slice(0,30) + '... → ' + n).join(', ')}`);

// Uniforma imageUrl — tutto parte da /signs/ o /argomenti/
let pathFixed = 0;
for (const q of questions) {
  if (q.imageUrl && q.imageUrl.startsWith('/questions/')) {
    q.imageUrl = '/signs/' + q.imageUrl.split('/').pop();
    pathFixed++;
  }
}
console.log(`  Path /questions/ → /signs/: ${pathFixed} domande`);

// ═══════════════════════════════════════
// 3. PULIRE LESSONS (rimuovi topics inline, solo riferimenti)
// ═══════════════════════════════════════
console.log('\n📖 3. Semplificazione lessons');

const cleanLessons = lessons.map(l => ({
  lessonId: l.lessonId,
  chapterId: l.chapterId,
  titleIT: l.titleIT,
  titleAR: l.titleAR || '',
  contentIT: l.contentIT || '',
  contentAR: l.contentAR || '',
  sortOrder: l.sortOrder || 0,
  durationSeconds: l.durationSeconds || 0,
  cdnUrl: l.cdnUrl || null,
  // topics: solo i topicKey come riferimenti, i dati sono in topics.json
  topicKeys: (l.topics || []).map(t => t.topicKey).filter(Boolean),
}));

console.log(`  Lezioni: ${cleanLessons.length}`);
console.log(`  TopicKey refs totali: ${cleanLessons.reduce((sum, l) => sum + l.topicKeys.length, 0)}`);

// ═══════════════════════════════════════
// 4. PULIRE CHAPTERS
// ═══════════════════════════════════════
console.log('\n📚 4. Pulizia chapters');

const cleanChapters = chapters.map(c => ({
  id: c.id || c.number,
  number: c.number,
  nameIT: c.nameIT,
  nameAR: c.nameAR || '',
  coverImageUrl: c.coverImageUrl || null,
  ministryWeight: c.ministryWeight || 0,
}));

const chaptersWithQuiz = new Set(questions.map(q => q.chapterId));
const emptyChapters = cleanChapters.filter(c => !chaptersWithQuiz.has(c.id) && !chaptersWithQuiz.has(c.number));
console.log(`  Capitoli: ${cleanChapters.length}`);
console.log(`  Senza quiz (teoria pura): ${emptyChapters.length} — ${emptyChapters.map(c => 'Cap ' + c.number).join(', ')}`);

// ═══════════════════════════════════════
// 5. SALVA TUTTO
// ═══════════════════════════════════════
console.log('\n💾 5. Salvataggio file definitivi');

save(srcDir, 'questions.json', questions);
save(srcDir, 'topics.json', topics);
save(srcDir, 'lessons.json', cleanLessons);
save(srcDir, 'chapters.json', cleanChapters);
// glossary resta com'è

console.log(`  ✅ questions.json: ${questions.length} domande`);
console.log(`  ✅ topics.json: ${topics.length} argomenti (NUOVO)`);
console.log(`  ✅ lessons.json: ${cleanLessons.length} lezioni (semplificato)`);
console.log(`  ✅ chapters.json: ${cleanChapters.length} capitoli`);
console.log(`  ✅ glossary.json: ${glossary.length} termini (invariato)`);

// ═══════════════════════════════════════
// 6. RIEPILOGO
// ═══════════════════════════════════════
console.log('\n═══════════════════════════════════════');
console.log('  DATASET FINALE V2');
console.log('═══════════════════════════════════════');
console.log(`  source/questions.json  — ${questions.length} domande (seed)`);
console.log(`  source/topics.json     — ${topics.length} argomenti (seed) ← NUOVO`);
console.log(`  source/lessons.json    — ${cleanLessons.length} lezioni (seed)`);
console.log(`  source/chapters.json   — ${cleanChapters.length} capitoli (seed)`);
console.log(`  source/glossary.json   — ${glossary.length} termini (seed)`);
console.log(`  enriched/tricks-by-topic.json   — 231 trucchi`);
console.log(`  enriched/trap-questions.json    — 446 trabocchetto`);
console.log(`  enriched/parole-amiche.json     — 30+30 keyword`);
console.log(`  enriched/avverbi-tranello.json  — regola bilingue`);
console.log(`  enriched/confusing-pairs.json   — 10 coppie`);
console.log(`  enriched/signs-descriptions.json — 397 descrizioni`);
console.log(`  enriched/flop10.json            — top sbagliate`);
console.log('═══════════════════════════════════════');
