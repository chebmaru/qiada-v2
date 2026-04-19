#!/usr/bin/env node
/**
 * RE-TAG con DeepSeek — assegna il topic corretto alle domande nei bucket generici
 *
 * Per ogni domanda in area_pedonale/continuazione/strada/carreggiata/corsia:
 * - Manda a DeepSeek il testo + lista topic disponibili (stesso capitolo + tutti)
 * - DeepSeek restituisce il topicKey migliore
 * - Salva il risultato in retag-results.json
 *
 * Costo stimato: ~$0.30-0.50 per 600 domande
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcDir = join(root, 'content', 'source');
const outputFile = join(root, 'content', 'retag-results.json');

// Load env
const envFile = readFileSync(join(root, '.env'), 'utf-8');
const apiKey = envFile.match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();
if (!apiKey) { console.error('❌ DEEPSEEK_API_KEY non trovata in .env'); process.exit(1); }

function load(file) {
  return JSON.parse(readFileSync(join(srcDir, file), 'utf-8'));
}

const questions = load('questions.json');
const topics = load('topics.json');

// Topic generici da svuotare
const genericTopics = new Set([
  'area_pedonale', 'continuazione', 'strada', 'carreggiata', 'corsia',
]);

// Domande da re-taggare
const toRetag = questions.filter(q => genericTopics.has(q.topicKey));
console.log(`\n📋 Domande da re-taggare: ${toRetag.length}`);

// Carica risultati precedenti (per riprendere in caso di interruzione)
let results = [];
if (existsSync(outputFile)) {
  results = JSON.parse(readFileSync(outputFile, 'utf-8'));
  console.log(`📂 Risultati precedenti caricati: ${results.length}`);
}
const alreadyDone = new Set(results.map(r => r.code));
const remaining = toRetag.filter(q => !alreadyDone.has(q.code));
console.log(`⏳ Da fare: ${remaining.length}\n`);

if (remaining.length === 0) {
  console.log('✅ Tutto già fatto!');
  process.exit(0);
}

// Organizza topic per capitolo
const topicsByChapter = {};
for (const t of topics) {
  const ch = t.chapterId || 'none';
  if (!topicsByChapter[ch]) topicsByChapter[ch] = [];
  topicsByChapter[ch].push({ topicKey: t.topicKey, titleIT: t.titleIT });
}

// Tutti i topic come fallback
const allTopicsList = topics.map(t => `${t.topicKey} — ${t.titleIT}`);

async function callDeepSeek(messages, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        if (res.status === 429) {
          console.log(`  ⏳ Rate limit, attendo 30s (tentativo ${attempt}/${retries})...`);
          await new Promise(r => setTimeout(r, 30000));
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${err}`);
      }

      const data = await res.json();
      return data.choices[0].message.content;
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`  ⚠️ Errore, retry ${attempt}/${retries}: ${e.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ─── Processa in batch da 15 ───
const BATCH_SIZE = 15;
const batches = [];
for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
  batches.push(remaining.slice(i, i + BATCH_SIZE));
}

console.log(`📦 Batch: ${batches.length} (${BATCH_SIZE} domande/batch)\n`);

let processed = 0;
let errors = 0;

for (let bi = 0; bi < batches.length; bi++) {
  const batch = batches[bi];

  // Raccogli i topic rilevanti per questo batch (capitoli coinvolti + tutti)
  const chapters = [...new Set(batch.map(q => q.chapterId))];
  const relevantTopics = [];
  const seenKeys = new Set();

  // Prima i topic dello stesso capitolo
  for (const ch of chapters) {
    for (const t of (topicsByChapter[ch] || [])) {
      if (!seenKeys.has(t.topicKey)) {
        relevantTopics.push(t);
        seenKeys.add(t.topicKey);
      }
    }
  }
  // Poi tutti gli altri
  for (const t of topics) {
    if (!seenKeys.has(t.topicKey)) {
      relevantTopics.push({ topicKey: t.topicKey, titleIT: t.titleIT });
      seenKeys.add(t.topicKey);
    }
  }

  const topicListStr = relevantTopics
    .map(t => `${t.topicKey} | ${t.titleIT}`)
    .join('\n');

  const questionsStr = batch
    .map((q, i) => `${i + 1}. [${q.code}] Cap ${q.chapterId} | "${q.textIT}"`)
    .join('\n');

  const prompt = `Sei un esperto di patente di guida italiana. Per ogni domanda dell'esame, assegna il topicKey PIÙ SPECIFICO dalla lista.

REGOLE:
- Scegli il topic che descrive ESATTAMENTE l'argomento della domanda
- Preferisci topic specifici (es. "limite_massimo_di_velocita") a generici (es. "strada")
- Se la domanda parla di un segnale stradale, scegli il topic del segnale specifico
- Se la domanda riguarda regole di comportamento, scegli il topic della regola
- NON inventare topicKey nuovi — usa SOLO quelli dalla lista

TOPIC DISPONIBILI:
${topicListStr}

DOMANDE:
${questionsStr}

Rispondi SOLO con un JSON array, un oggetto per domanda:
[{"code":"B12345","topicKey":"il_topic_scelto","reason":"motivo breve"}]

Nient'altro, solo il JSON array.`;

  try {
    process.stdout.write(`  Batch ${bi + 1}/${batches.length} (${batch.length} domande)... `);

    const response = await callDeepSeek([
      { role: 'system', content: 'Rispondi SOLO con JSON valido, nessun altro testo.' },
      { role: 'user', content: prompt },
    ]);

    // Parse response
    let parsed;
    try {
      // Pulisci markdown code blocks se presenti
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.log(`❌ JSON non valido`);
      console.log(`  Response: ${response.slice(0, 200)}...`);
      errors += batch.length;
      continue;
    }

    if (!Array.isArray(parsed)) {
      console.log(`❌ Non è un array`);
      errors += batch.length;
      continue;
    }

    // Valida e salva
    let batchOk = 0;
    for (const item of parsed) {
      if (!item.code || !item.topicKey) continue;

      // Verifica che il topicKey esista
      const topicExists = topics.some(t => t.topicKey === item.topicKey);
      const q = batch.find(b => b.code === item.code);

      if (q && topicExists) {
        results.push({
          code: item.code,
          oldTopic: q.topicKey,
          newTopic: item.topicKey,
          changed: q.topicKey !== item.topicKey,
          reason: item.reason || '',
          chapterId: q.chapterId,
        });
        batchOk++;
      } else if (q && !topicExists) {
        // Topic non esiste, teniamo il vecchio
        results.push({
          code: item.code,
          oldTopic: q.topicKey,
          newTopic: q.topicKey,
          changed: false,
          reason: `topic "${item.topicKey}" non esiste, mantenuto originale`,
          chapterId: q.chapterId,
        });
        batchOk++;
      }
    }

    processed += batchOk;
    console.log(`✅ ${batchOk}/${batch.length} ok`);

    // Salva progressi dopo ogni batch
    writeFileSync(outputFile, JSON.stringify(results, null, 2));

    // Rate limiting gentile
    if (bi < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }

  } catch (e) {
    console.log(`❌ Errore: ${e.message}`);
    errors += batch.length;
    // Salva comunque i progressi
    writeFileSync(outputFile, JSON.stringify(results, null, 2));
    // Pausa più lunga dopo errore
    await new Promise(r => setTimeout(r, 10000));
  }
}

// ─── Report finale ───
console.log('\n═══════════════════════════════════════');
console.log('  REPORT RE-TAG');
console.log('═══════════════════════════════════════');

const changed = results.filter(r => r.changed);
const unchanged = results.filter(r => !r.changed);

console.log(`  Totale processate: ${results.length}`);
console.log(`  Cambiate: ${changed.length}`);
console.log(`  Confermate (topic era giusto): ${unchanged.length}`);
console.log(`  Errori: ${errors}`);

// Distribuzione nuovi topic
const newDist = {};
changed.forEach(r => { newDist[r.newTopic] = (newDist[r.newTopic] || 0) + 1; });
console.log('\n  Top 15 nuovi topic assegnati:');
Object.entries(newDist).sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([tk, n]) => console.log(`    ${n} → ${tk}`));

// Campione
console.log('\n  Campione 5 cambiamenti:');
changed.slice(0, 5).forEach(r => {
  console.log(`    [${r.code}] ${r.oldTopic} → ${r.newTopic} (${r.reason})`);
});

console.log(`\n💾 Risultati: ${outputFile}`);
console.log('═══════════════════════════════════════');
