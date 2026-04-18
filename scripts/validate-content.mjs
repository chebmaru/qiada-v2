#!/usr/bin/env node
/**
 * Validazione dataset V2 — gira PRIMA del seed DB.
 * Se FAIL su check CRITICO → exit 1 (blocca il seed).
 * Se WARNING → log e continua.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', 'content', 'source');

function load(file) {
  return JSON.parse(readFileSync(join(contentDir, file), 'utf-8'));
}

let errors = 0;
let warnings = 0;

function PASS(msg) { console.log(`  ✅ ${msg}`); }
function WARN(msg) { warnings++; console.log(`  ⚠️  ${msg}`); }
function FAIL(msg) { errors++; console.log(`  ❌ ${msg}`); }

console.log('═══════════════════════════════════════');
console.log('  VALIDAZIONE DATASET QIADA V2');
console.log('═══════════════════════════════════════\n');

// ─── QUESTIONS ───
const q = load('questions.json');
console.log(`📋 DOMANDE: ${q.length}`);

// Duplicati codice
const codes = q.map(x => x.code);
const dupCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
if (dupCodes.length > 0) FAIL(`Codici duplicati: ${dupCodes.join(', ')}`);
else PASS('Zero codici duplicati');

// Campi obbligatori vuoti
const noText = q.filter(x => !x.textIT?.trim());
const noTextAR = q.filter(x => !x.textAR?.trim());
const noExplIT = q.filter(x => !x.explanationIT?.trim());
const noExplAR = q.filter(x => !x.explanationAR?.trim());
const noCode = q.filter(x => !x.code?.trim());
const noTopic = q.filter(x => !x.topicKey?.trim());
const noChapter = q.filter(x => !x.chapterId);
const notBool = q.filter(x => typeof x.isTrue !== 'boolean');

if (noText.length > 0) FAIL(`${noText.length} senza textIT`);
else PASS('100% textIT');

if (noTextAR.length > 0) FAIL(`${noTextAR.length} senza textAR`);
else PASS('100% textAR');

if (noExplIT.length > 0) FAIL(`${noExplIT.length} senza explanationIT`);
else PASS('100% explanationIT');

if (noExplAR.length > 0) FAIL(`${noExplAR.length} senza explanationAR`);
else PASS('100% explanationAR');

if (noCode.length > 0) FAIL(`${noCode.length} senza code`);
else PASS('100% code');

if (noTopic.length > 0) FAIL(`${noTopic.length} senza topicKey`);
else PASS('100% topicKey');

if (noChapter.length > 0) FAIL(`${noChapter.length} senza chapterId`);
else PASS('100% chapterId');

if (notBool.length > 0) FAIL(`${notBool.length} isTrue non boolean`);
else PASS('100% isTrue è boolean');

// Distribuzione V/F
const trueCount = q.filter(x => x.isTrue).length;
const falseCount = q.filter(x => !x.isTrue).length;
const pctTrue = Math.round(trueCount / q.length * 100);
PASS(`Distribuzione: ${trueCount} VERO (${pctTrue}%) / ${falseCount} FALSO (${100 - pctTrue}%)`);

// TopicKey qualità
const topicKeys = [...new Set(q.map(x => x.topicKey).filter(Boolean))];
const longKeys = topicKeys.filter(tk => tk.length > 60);
if (longKeys.length > 0) WARN(`${longKeys.length} topicKey > 60 chars: ${longKeys.slice(0, 3).join(', ')}...`);
else PASS('Tutti topicKey ≤ 60 chars');

const mixedCase = topicKeys.filter(tk => tk !== tk.toLowerCase());
if (mixedCase.length > 0) WARN(`${mixedCase.length} topicKey mixed case`);
else PASS('Tutti topicKey lowercase');

// ─── CHAPTERS ───
console.log('');
const ch = load('chapters.json');
console.log(`📚 CAPITOLI: ${ch.length}`);

const chaptersInQ = new Set(q.map(x => x.chapterId));
const emptyChapters = ch.filter(c => !chaptersInQ.has(c.id) && !chaptersInQ.has(c.number));
if (emptyChapters.length > 0) {
  WARN(`${emptyChapters.length} capitoli senza domande: ${emptyChapters.map(c => `Cap ${c.number} (${c.nameIT})`).join(', ')}`);
} else {
  PASS('Tutti i capitoli hanno domande');
}

// ─── LESSONS ───
console.log('');
const l = load('lessons.json');
console.log(`📖 LEZIONI: ${l.length}`);

const noContentAR = l.filter(x => !x.contentAR?.trim());
if (noContentAR.length > 0) WARN(`${noContentAR.length} lezioni senza contentAR`);
else PASS('100% contentAR');

const noTopics = l.filter(x => (!x.topicKeys || x.topicKeys.length === 0) && (!x.topics || x.topics.length === 0));
if (noTopics.length > 0) WARN(`${noTopics.length} lezioni senza topicKeys[]`);
else PASS('Tutte le lezioni hanno topicKeys[]');

const hasLegacy = l.filter(x => x.topicsJson);
if (hasLegacy.length > 0) FAIL(`${hasLegacy.length} lezioni con topicsJson legacy — rimuovere!`);
else PASS('Zero topicsJson legacy');

// Orfani: topicKey quiz senza lezione (supporta sia topicKeys[] che topics[].topicKey)
const allLessonTopics = new Set(l.flatMap(x => {
  if (x.topicKeys) return x.topicKeys;
  return (x.topics || []).map(t => t.topicKey);
}).filter(Boolean));
const orphanTopics = topicKeys.filter(tk => !allLessonTopics.has(tk));
if (orphanTopics.length > 0) {
  WARN(`${orphanTopics.length} topicKey quiz senza lezione: ${orphanTopics.slice(0, 5).join(', ')}${orphanTopics.length > 5 ? '...' : ''}`);
} else {
  PASS('Zero topicKey orfani');
}

// ─── GLOSSARY ───
console.log('');
const gl = load('glossary.json');
console.log(`📝 GLOSSARIO: ${gl.length} termini`);

const glNoAR = gl.filter(x => !x.termAR?.trim() || !x.definitionAR?.trim());
if (glNoAR.length > 0) WARN(`${glNoAR.length} termini senza traduzione AR`);
else PASS('100% traduzione AR');

// ─── CAMPIONE RANDOM ───
console.log('\n───────────────────────────────────────');
console.log('  🔍 CAMPIONE RANDOM (3 domande)');
console.log('───────────────────────────────────────');
for (let i = 0; i < 3; i++) {
  const r = q[Math.floor(Math.random() * q.length)];
  console.log(`\n  [${r.code}] ${r.isTrue ? 'VERO' : 'FALSO'} — Cap ${r.chapterId} — ${r.topicKey}`);
  console.log(`  IT: ${r.textIT.slice(0, 80)}${r.textIT.length > 80 ? '...' : ''}`);
  console.log(`  AR: ${r.textAR.slice(0, 80)}${r.textAR.length > 80 ? '...' : ''}`);
}

// ─── VERDETTO ───
console.log('\n═══════════════════════════════════════');
if (errors > 0) {
  console.log(`  ❌ FAIL — ${errors} errori critici, ${warnings} warning`);
  console.log('  Il seed DB NON deve procedere.');
  process.exit(1);
} else if (warnings > 0) {
  console.log(`  ⚠️  PASS con ${warnings} warning`);
  console.log('  Il seed DB può procedere.');
} else {
  console.log('  ✅ PASS — dataset perfetto');
}
console.log('═══════════════════════════════════════');
