/**
 * Translate 85 topics missing titleAR + contentIT + contentAR
 * Uses DeepSeek API for cost efficiency (~$2-3 total)
 *
 * Usage: node scripts/translate-topics-deepseek.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) {
  console.error('ERROR: DEEPSEEK_API_KEY not set in .env');
  process.exit(1);
}

const INPUT = path.join(__dirname, 'output/topics-for-deepseek.json');
const OUTPUT = path.join(__dirname, 'output/topics-translated.json');
const LOG = path.join(__dirname, 'output/translate-topics-log.jsonl');

const BATCH_SIZE = 10; // 10 topics per API call
const DELAY_MS = 1500; // rate limit

async function callDeepSeek(prompt) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Sei un traduttore esperto italiano-arabo specializzato nella patente di guida italiana.
Devi generare per ogni argomento:
1. titleAR: traduzione araba del titolo (breve, 2-5 parole)
2. contentIT: spiegazione didattica in italiano (2-4 frasi, livello A2/B1, chiara per uno studente arabofono)
3. contentAR: traduzione araba della spiegazione contentIT

REGOLE:
- contentIT deve spiegare il concetto come se parlassi a uno studente che prepara l'esame patente
- Se ci sono domande di esempio, usa il contesto per capire meglio l'argomento
- Numeri SEMPRE in formato occidentale (0123456789), MAI numeri arabi orientali
- Rispondi SOLO con JSON valido, nessun testo prima o dopo
- Formato: array di oggetti con { topicKey, titleAR, contentIT, contentAR }`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

function buildPrompt(batch) {
  const items = batch.map(t => {
    const obj = {
      topicKey: t.topicKey,
      titleIT: t.titleIT,
      questionCount: t.questionCount,
    };
    if (t.sampleQuestions && t.sampleQuestions.length > 0) {
      obj.sampleQuestions = t.sampleQuestions.map(q => `${q.textIT} (${q.isTrue ? 'VERO' : 'FALSO'})`);
    }
    return obj;
  });

  return `Traduci questi ${batch.length} argomenti della patente di guida italiana.
Per ognuno genera titleAR, contentIT e contentAR.

${JSON.stringify(items, null, 2)}

Rispondi con un array JSON valido.`;
}

function parseResponse(text) {
  // Strip markdown code fences if present
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return JSON.parse(clean);
}

async function main() {
  const topics = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  console.log(`Loaded ${topics.length} topics to translate`);

  const results = [];
  const batches = [];
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    batches.push(topics.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\nBatch ${i + 1}/${batches.length} (${batch.length} topics)...`);

    try {
      const prompt = buildPrompt(batch);
      const response = await callDeepSeek(prompt);
      const translated = parseResponse(response);

      // Validate
      for (const t of translated) {
        if (!t.topicKey || !t.titleAR || !t.contentIT || !t.contentAR) {
          console.warn(`  WARNING: incomplete translation for ${t.topicKey}`);
        }
        // Check for eastern arabic numerals
        if (/[٠-٩]/.test(t.titleAR + t.contentAR)) {
          console.warn(`  WARNING: eastern numerals found in ${t.topicKey}, fixing...`);
          const fix = s => s.replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString());
          t.titleAR = fix(t.titleAR);
          t.contentAR = fix(t.contentAR);
        }
      }

      results.push(...translated);

      // Log
      fs.appendFileSync(LOG, JSON.stringify({
        batch: i + 1,
        count: translated.length,
        keys: translated.map(t => t.topicKey),
        timestamp: new Date().toISOString(),
      }) + '\n');

      console.log(`  OK: ${translated.length} translated`);
    } catch (err) {
      console.error(`  ERROR batch ${i + 1}: ${err.message}`);
      // Log failed batch for retry
      fs.appendFileSync(LOG, JSON.stringify({
        batch: i + 1,
        error: err.message,
        keys: batch.map(t => t.topicKey),
        timestamp: new Date().toISOString(),
      }) + '\n');
    }

    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Save results
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n=== DONE ===`);
  console.log(`Translated: ${results.length}/${topics.length}`);
  console.log(`Saved to: ${OUTPUT}`);

  // QA validation
  const issues = [];
  const expected = new Set(topics.map(t => t.topicKey));
  const got = new Set(results.map(t => t.topicKey));

  for (const key of expected) {
    if (!got.has(key)) issues.push(`MISSING: ${key}`);
  }
  for (const t of results) {
    if (!t.titleAR) issues.push(`EMPTY titleAR: ${t.topicKey}`);
    if (!t.contentIT) issues.push(`EMPTY contentIT: ${t.topicKey}`);
    if (!t.contentAR) issues.push(`EMPTY contentAR: ${t.topicKey}`);
    if (t.contentIT && t.contentIT.length < 20) issues.push(`SHORT contentIT (${t.contentIT.length}): ${t.topicKey}`);
  }

  if (issues.length > 0) {
    console.log(`\nWARNINGS (${issues.length}):`);
    issues.forEach(i => console.log(`  - ${i}`));
    console.log('\nVERDICT: FAIL — review issues above');
  } else {
    console.log('\nVERDICT: PASS — all translations complete and valid');
  }

  // Sample 3 random
  console.log('\nCAMPIONE 3 random:');
  const shuffled = [...results].sort(() => Math.random() - 0.5);
  shuffled.slice(0, 3).forEach(t => {
    console.log(`  ${t.topicKey}:`);
    console.log(`    titleAR: ${t.titleAR}`);
    console.log(`    contentIT: ${t.contentIT.substring(0, 80)}...`);
    console.log(`    contentAR: ${t.contentAR.substring(0, 80)}...`);
  });
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
