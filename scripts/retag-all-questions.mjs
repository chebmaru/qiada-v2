/**
 * Re-tag ALL 7056 questions to their correct topic using DeepSeek API.
 *
 * Strategy:
 * - Send batches of 50 questions with the full topic list
 * - DeepSeek assigns topicKey based on Italian text + image filename
 * - Results saved to content/source/questions-retagged.json
 * - Validation built-in: check coverage, duplicates, unknown keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load data
const qs = JSON.parse(fs.readFileSync(path.join(root, 'content/source/questions.json'), 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));

// DeepSeek config
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ||
  fs.readFileSync(path.join(root, '.env'), 'utf-8').match(/DEEPSEEK_API_KEY=(.+)/)?.[1]?.trim();

if (!DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY not found');
  process.exit(1);
}

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';
const BATCH_SIZE = 80;
const MAX_RETRIES = 3;
const PROGRESS_FILE = path.join(root, 'scripts/output/retag-progress.json');

// Build topic reference (compact)
const topicList = topics
  .filter(t => t.topicKey !== 'na_dipende')
  .map(t => `${t.topicKey}|${t.titleIT}|ch${t.chapterId}`)
  .join('\n');

const SYSTEM_PROMPT = `Sei un esperto di patente italiana. Il tuo compito è assegnare ogni domanda quiz al topic (argomento) più appropriato.

LISTA COMPLETA DEI TOPIC (formato: topicKey|titoloIT|capitolo):
${topicList}

REGOLE:
1. Ogni domanda ha un testo italiano e opzionalmente un'immagine di un segnale stradale
2. Assegna il topicKey PIÙ SPECIFICO che descrive il contenuto della domanda
3. Se la domanda parla di un segnale specifico (es. STOP, divieto di sosta), assegna il topic di quel segnale
4. Se la domanda contiene "segnale raffigurato" + un'immagine, usa il nome dell'immagine per capire il segnale
5. NON assegnare a topic generici/contenitore se esiste un topic specifico
6. Il topic deve appartenere allo stesso capitolo o a un capitolo correlato

IMMAGINI COMUNI:
- curva-destra.svg = segnale curva a destra
- divieto-sorpasso.svg = divieto di sorpasso
- divieto-sosta.svg = divieto di sosta
- divieto-transito.svg = divieto di transito
- altri-pericoli.svg = altri pericoli
- qb_*.png o ministeriale_*.jpg = immagine del quiz, usa il testo per capire

Rispondi SOLO con un JSON array. Per ogni domanda:
{"code":"CODICE","topicKey":"topicKey_assegnato"}

Nessun altro testo, solo il JSON array.`;

async function callDeepSeek(batch, retryCount = 0) {
  const questionsText = batch.map(q => {
    let line = `[${q.code}] ch${q.chapterId} | ${q.textIT}`;
    if (q.imageUrl) line += ` | img:${path.basename(q.imageUrl)}`;
    return line;
  }).join('\n');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Assegna i topicKey corretti a queste ${batch.length} domande:\n\n${questionsText}` }
        ],
        temperature: 0.1,
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Extract JSON from response (might have markdown code block)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array in response');

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      console.log(`  Retry ${retryCount + 1}/${MAX_RETRIES}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return callDeepSeek(batch, retryCount + 1);
    }
    throw err;
  }
}

async function main() {
  console.log('=== QUESTION RE-TAGGING ===');
  console.log(`Questions: ${qs.length} | Topics: ${topics.length} | Batch size: ${BATCH_SIZE}`);

  const validTopicKeys = new Set(topics.map(t => t.topicKey));

  // Load progress if exists
  let results = {};
  let startBatch = 0;
  if (fs.existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    results = progress.results || {};
    startBatch = progress.nextBatch || 0;
    console.log(`Resuming from batch ${startBatch} (${Object.keys(results).length} already done)`);
  }

  const totalBatches = Math.ceil(qs.length / BATCH_SIZE);

  for (let i = startBatch; i < totalBatches; i++) {
    const batch = qs.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const pct = ((i + 1) / totalBatches * 100).toFixed(1);
    process.stdout.write(`Batch ${i + 1}/${totalBatches} (${pct}%) [${batch.length} questions]... `);

    try {
      const batchResults = await callDeepSeek(batch);

      // Validate and store
      let valid = 0, invalid = 0;
      batchResults.forEach(r => {
        if (r.code && r.topicKey) {
          if (validTopicKeys.has(r.topicKey)) {
            results[r.code] = r.topicKey;
            valid++;
          } else {
            // Try to find closest match
            const close = [...validTopicKeys].find(k => k.includes(r.topicKey) || r.topicKey.includes(k));
            if (close) {
              results[r.code] = close;
              valid++;
            } else {
              console.log(`\n  Unknown topicKey: ${r.topicKey} for ${r.code}`);
              invalid++;
            }
          }
        }
      });

      console.log(`${valid} OK, ${invalid} invalid`);

      // Save progress after each batch
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        results,
        nextBatch: i + 1,
        timestamp: new Date().toISOString()
      }), 'utf-8');

      // Rate limiting
      if (i < totalBatches - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      // Save progress and exit
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
        results,
        nextBatch: i,
        timestamp: new Date().toISOString(),
        error: err.message
      }), 'utf-8');
      console.log(`Progress saved. Run again to resume from batch ${i}.`);
      process.exit(1);
    }
  }

  // ── VALIDATION ──
  console.log('\n=== VALIDATION ===');

  const retaggedCount = Object.keys(results).length;
  const missingCodes = qs.filter(q => !results[q.code]).map(q => q.code);
  const changed = qs.filter(q => results[q.code] && results[q.code] !== q.topicKey);

  console.log(`Total retagged: ${retaggedCount}/${qs.length}`);
  console.log(`Missing: ${missingCodes.length}`);
  console.log(`Changed from original: ${changed.length} (${(changed.length/qs.length*100).toFixed(1)}%)`);
  console.log(`Unchanged: ${qs.length - changed.length}`);

  if (missingCodes.length > 0) {
    console.log(`Missing codes: ${missingCodes.slice(0, 10).join(', ')}...`);
  }

  // Check topic distribution
  const topicDist = {};
  Object.values(results).forEach(tk => topicDist[tk] = (topicDist[tk] || 0) + 1);
  const emptyTopics = [...validTopicKeys].filter(k => !topicDist[k] && k !== 'na_dipende');
  console.log(`Topics with questions: ${Object.keys(topicDist).length}`);
  console.log(`Topics still empty: ${emptyTopics.length}`);
  if (emptyTopics.length > 0) {
    emptyTopics.forEach(k => console.log(`  EMPTY: ${k}`));
  }

  // ── SAMPLE 3 random changed ──
  console.log('\n=== SAMPLE (3 random changed) ===');
  const shuffled = changed.sort(() => Math.random() - 0.5).slice(0, 3);
  shuffled.forEach(q => {
    console.log(`${q.code}: "${q.textIT.substring(0, 80)}..."`);
    console.log(`  OLD: ${q.topicKey}`);
    console.log(`  NEW: ${results[q.code]}`);
    console.log('');
  });

  // ── SAVE retagged questions ──
  const retagged = qs.map(q => ({
    ...q,
    topicKey: results[q.code] || q.topicKey  // fallback to original if not retagged
  }));

  const outPath = path.join(root, 'content/source/questions-retagged.json');
  fs.writeFileSync(outPath, JSON.stringify(retagged, null, 2), 'utf-8');
  console.log(`\nSaved to: ${outPath}`);

  // ── VERDICT ──
  const coverage = retaggedCount / qs.length;
  if (coverage >= 0.99 && missingCodes.length <= 10) {
    console.log('\n✅ VERDICT: PASS — Ready to apply');
  } else {
    console.log(`\n⚠️ VERDICT: PARTIAL — ${missingCodes.length} questions missing, run again to resume`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
