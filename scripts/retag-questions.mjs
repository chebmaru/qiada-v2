#!/usr/bin/env node
/**
 * RE-TAG QUESTIONS — Fase 1: Analisi e rule-based
 *
 * Per ogni domanda:
 * 1. Controlla se il topicKey attuale è coerente col testo
 * 2. Propone topic migliori basandosi su keyword matching
 * 3. Produce report + question-retag-plan.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'content', 'source');

function load(file) {
  return JSON.parse(readFileSync(join(srcDir, file), 'utf-8'));
}

const questions = load('questions.json');
const topics = load('topics.json');

console.log('═══════════════════════════════════════');
console.log('  RE-TAG ANALYSIS');
console.log('═══════════════════════════════════════\n');

// ─── Build keyword index per topic ───
// Per ogni topic, estrai le parole chiave dal titolo e dal topicKey
const topicIndex = topics.map(t => {
  const words = new Set();

  // Dal topicKey
  t.topicKey.split('_').forEach(w => {
    if (w.length > 2) words.add(w.toLowerCase());
  });

  // Dal titleIT
  if (t.titleIT) {
    t.titleIT.toLowerCase().split(/\s+/).forEach(w => {
      const clean = w.replace(/[^a-zàèéìòù]/g, '');
      if (clean.length > 2) words.add(clean);
    });
  }

  return {
    topicKey: t.topicKey,
    titleIT: t.titleIT,
    chapterId: t.chapterId,
    keywords: [...words],
  };
});

// ─── Definisci le keyword forti per topic specifici ───
// Queste sono regole manuali per i casi più evidenti
const strongRules = [
  { keywords: ['semaforo', 'semaforica', 'semaforico'], topics: ['la_luce_rossa_del_semaforo_e', 'la_luce_gialla_fissa_del_semaforo_e', 'lanterna_semaforica_veicolare_normale_e', 'possiamo_trovare_una_luce_gialla_lampeggiante', 'quando_il_semaforo_emette_luce_verde_nella_nostra'] },
  { keywords: ['sorpasso', 'sorpassare'], topics: ['il_sorpasso_e', 'in_caso_di_sorpasso_di_notte_su_strada_a_doppio', 'fine_del_divieto_di_sorpasso_e'] },
  { keywords: ['sosta', 'sostare', 'parcheggio'], topics: ['la_sosta', 'la_sosta_e_vietata', 'divieto_di_sosta', 'la_sosta_di_autoveicoli_in_doppia_fila'] },
  { keywords: ['fermata', 'fermarsi', 'stop'], topics: ['fermarsi_e_dare', 'preavviso_di_fermarsi_e_dare'] },
  { keywords: ['precedenza'], topics: ['dare_precedenza', 'obbligatorio_dare_la_precedenza_a_destra_e_a', 'con_diritto_di_precedenza_a_sinistra', 'dare_precedenza_nei_sensi_unici_alternati'] },
  { keywords: ['velocità', 'velocita', 'km/h', 'kmh'], topics: ['limiti_di_velocita_limiti_massimi_di_velocita', 'la_velocita_deve_essere_regolata', 'kmh_e'] },
  { keywords: ['cintura', 'cinture'], topics: ['cinture_di_sicurezza'] },
  { keywords: ['casco'], topics: ['casco'] },
  { keywords: ['patente'], topics: ['con_la_patente_di_categoria_b_si_possono_guidare', 'con_la_patente_di_categoria_a_si_possono_guidare', 'la_revisione_della_patente', 'la_revoca_della_patente'] },
  { keywords: ['assicurazione', 'r.c.a', 'rca', 'polizza', 'massimali'], topics: ['responsabilita_civile', 'responsabilita_civile_auto_i'] },
  { keywords: ['incidente'], topics: ['dopo_un_incidente_stradale', 'cause_principali_di_incidenti_possono'] },
  { keywords: ['alcol', 'alcool', 'alcolica', 'ebbrezza', 'ubriaco'], topics: ['influenza_dell_alcol_sulla_guida_e'] },
  { keywords: ['droga', 'stupefacent', 'sostanze'], topics: ['influenza_di_sostanze_stupefacenti_e'] },
  { keywords: ['pneumatic', 'gomm', 'ruot'], topics: ['pneumatici_i'] },
  { keywords: ['freno', 'frenat', 'frenatura', 'frenare'], topics: ['se_il_veicolo_in_fase_di_frenatura_tende_a_sbandare', 'per_controllare_lo_sbandamento_del_veicolo_e'] },
  { keywords: ['pedonal', 'pedon'], topics: ['attraversamento_pedonale'] },
  { keywords: ['autobus', 'filobus', 'tram'], topics: ['attraversamento_pedonale'] },
  { keywords: ['inquinamento', 'emissioni', 'scarico', 'catalizzatore', 'marmitta'], topics: ['inquinamento_prodotto_dai_veicoli_con_motore_a', 'inquinamento_atmosferico_prodotto_dai_veicoli_con_motore_diesel', 'inquinamento_da_rumore'] },
  { keywords: ['rotatoria', 'rotonda'], topics: ['rotatoria', 'rotatoria_e'] },
  { keywords: ['passaggio a livello', 'barriere', 'semibarriere'], topics: ['passaggio_a_livello_con_barriere', 'passaggio_a_livello_con_barriere_o_semibarriere', 'passaggio_a_livello_senza_barriere'] },
  { keywords: ['aquaplaning', 'idroplan'], topics: ['aquaplaning_perdita_di'] },
  { keywords: ['nebbia'], topics: ['in_caso_di_nebbia_fitta'] },
  { keywords: ['pioggia', 'bagnato', 'bagnata'], topics: ['in_caso_di_pioggia'] },
  { keywords: ['neve', 'ghiaccio', 'ghiacciata', 'catene'], topics: ['coperta_di_neve_o_ghiaccio'] },
  { keywords: ['olio', 'lubrificant'], topics: ['olio_e'] },
  { keywords: ['batteria'], topics: ['simbolo_della_batteria'] },
  { keywords: ['galleria', 'gallerie', 'tunnel'], topics: ['uscita_delle_gallerie_e'] },
  { keywords: ['carico', 'carichi'], topics: ['il_carico_deve_essere_sistemato_sul_veicolo_in_modo', 'spostamento_del_carico_in_avanti_e'] },
  { keywords: ['rimorchio', 'rimorchi', 'semirimorchi'], topics: ['sporto_cose_di_massa_a_pieno_carico', 'pannelli_posteriori_trasporto_cose'] },
  { keywords: ['striscia', 'strisce', 'segnaletica orizzontale'], topics: ['striscia_longitudinale_continua_e_discontinua', 'striscia_longitudinale_discontinua_e_continua', 'in_una_strada_a_senso_unico_con_la_striscia_bianca_discontinua'] },
  { keywords: ['documento', 'documenti', 'esibire', 'carta di circolazione', 'certificato'], topics: ['documenti_da_esibire_agli'] },
  { keywords: ['convoglio', 'corteo', 'cortei', 'militare', 'militari'], topics: ['convogli_militari_e_cortei_e'] },
];

// ─── Topic generici (cestini) — da svuotare ───
const genericTopics = new Set([
  'area_pedonale',
  'continuazione',
  'strada',
  'carreggiata',
  'corsia',
]);

// ─── Analisi ───
console.log('📊 Distribuzione attuale:');
const topicCounts = {};
questions.forEach(q => { topicCounts[q.topicKey] = (topicCounts[q.topicKey] || 0) + 1; });

const inGeneric = questions.filter(q => genericTopics.has(q.topicKey));
console.log(`  Domande in topic generici: ${inGeneric.length} / ${questions.length} (${Math.round(inGeneric.length/questions.length*100)}%)`);
genericTopics.forEach(g => {
  console.log(`    ${g}: ${topicCounts[g] || 0}`);
});

// ─── Score each question against all topics ───
function scoreQuestion(q, topicIdx) {
  const text = (q.textIT || '').toLowerCase();
  const scores = [];

  // 1. Strong rules
  for (const rule of strongRules) {
    const matched = rule.keywords.some(kw => text.includes(kw));
    if (matched) {
      for (const tk of rule.topics) {
        scores.push({ topicKey: tk, score: 10, reason: 'strong-rule' });
      }
    }
  }

  // 2. Keyword matching con topic index
  for (const t of topicIdx) {
    const matchedKw = t.keywords.filter(kw => text.includes(kw));
    if (matchedKw.length >= 2) {
      scores.push({ topicKey: t.topicKey, score: matchedKw.length, reason: 'keyword-match' });
    }
  }

  // 3. Same chapter bonus
  for (const s of scores) {
    const topic = topicIdx.find(t => t.topicKey === s.topicKey);
    if (topic && topic.chapterId === q.chapterId) {
      s.score += 3;
      s.reason += '+chapter';
    }
  }

  // Deduplica e ordina
  const byTopic = {};
  for (const s of scores) {
    if (!byTopic[s.topicKey] || byTopic[s.topicKey].score < s.score) {
      byTopic[s.topicKey] = s;
    }
  }

  return Object.values(byTopic)
    .filter(s => s.topicKey !== q.topicKey) // escludi il topic attuale
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ─── Processa tutte le domande ───
const retagPlan = [];
let couldRetag = 0;
let needsAI = 0;

for (const q of questions) {
  const isGeneric = genericTopics.has(q.topicKey);
  const candidates = scoreQuestion(q, topicIndex);

  if (isGeneric && candidates.length > 0 && candidates[0].score >= 10) {
    // Caso chiaro: regola forte, topic generico → retag automatico
    retagPlan.push({
      code: q.code,
      oldTopic: q.topicKey,
      newTopic: candidates[0].topicKey,
      confidence: 'high',
      score: candidates[0].score,
      reason: candidates[0].reason,
      textIT: q.textIT.slice(0, 100),
      allCandidates: candidates.slice(0, 3).map(c => c.topicKey),
    });
    couldRetag++;
  } else if (isGeneric) {
    // Topic generico ma nessun match forte → serve DeepSeek
    retagPlan.push({
      code: q.code,
      oldTopic: q.topicKey,
      newTopic: null,
      confidence: 'needs-ai',
      score: candidates.length > 0 ? candidates[0].score : 0,
      textIT: q.textIT.slice(0, 100),
      allCandidates: candidates.slice(0, 3).map(c => c.topicKey),
    });
    needsAI++;
  } else if (candidates.length > 0 && candidates[0].score >= 13) {
    // Topic specifico ma c'è un match MOLTO forte per un altro → possibile M2M
    retagPlan.push({
      code: q.code,
      oldTopic: q.topicKey,
      newTopic: candidates[0].topicKey,
      confidence: 'secondary-topic',
      score: candidates[0].score,
      reason: candidates[0].reason,
      textIT: q.textIT.slice(0, 100),
      allCandidates: candidates.slice(0, 3).map(c => c.topicKey),
    });
  }
}

// ─── Report ───
console.log(`\n📋 PIANO RE-TAG:`);
console.log(`  Re-tag automatico (high confidence): ${couldRetag}`);
console.log(`  Serve DeepSeek (ambiguo): ${needsAI}`);
console.log(`  Topic secondari (M2M): ${retagPlan.filter(r => r.confidence === 'secondary-topic').length}`);
console.log(`  Non toccati: ${questions.length - retagPlan.length}`);

// Campione retag automatici
console.log('\n─── CAMPIONE: 10 retag automatici ───');
const highConf = retagPlan.filter(r => r.confidence === 'high');
for (const r of highConf.slice(0, 10)) {
  console.log(`  [${r.code}] ${r.oldTopic} → ${r.newTopic} (${r.reason})`);
  console.log(`    "${r.textIT}"`);
}

// Campione needs-ai
console.log('\n─── CAMPIONE: 10 che servono DeepSeek ───');
const aiNeeded = retagPlan.filter(r => r.confidence === 'needs-ai');
for (const r of aiNeeded.slice(0, 10)) {
  console.log(`  [${r.code}] ${r.oldTopic} — candidates: ${r.allCandidates.join(', ') || 'NESSUNO'}`);
  console.log(`    "${r.textIT}"`);
}

// Distribuzione needs-ai per topic generico
console.log('\n─── NEEDS-AI per topic generico ───');
const aiByTopic = {};
aiNeeded.forEach(r => { aiByTopic[r.oldTopic] = (aiByTopic[r.oldTopic] || 0) + 1; });
Object.entries(aiByTopic).sort((a,b) => b[1]-a[1]).forEach(([tk, n]) => {
  console.log(`  ${tk}: ${n} domande`);
});

// Salva il piano
writeFileSync(join(srcDir, '..', 'retag-plan.json'), JSON.stringify(retagPlan, null, 2));
console.log(`\n💾 Salvato: content/retag-plan.json (${retagPlan.length} entries)`);

console.log('\n═══════════════════════════════════════');
