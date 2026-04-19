const fs = require("fs");

// DeepSeek API for translation
const DEEPSEEK_API_KEY = "sk-11fb82380df348f083dfaf1b5c2052bf";
const API_URL = "https://api.deepseek.com/v1/chat/completions";

const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const incomplete = qs.filter(q => !q.textAR || !q.explanationIT || !q.explanationAR);

console.log("Domande da tradurre:", incomplete.length);
if (incomplete.length === 0) {
  console.log("Niente da fare!");
  process.exit(0);
}

// Process in batches of 20
const BATCH_SIZE = 20;
const batches = [];
for (let i = 0; i < incomplete.length; i += BATCH_SIZE) {
  batches.push(incomplete.slice(i, i + BATCH_SIZE));
}
console.log("Batch:", batches.length);

async function translateBatch(batch, batchNum) {
  const questionsText = batch.map((q, i) =>
    `${i + 1}. [${q.isTrue ? "VERO" : "FALSO"}] ${q.textIT}`
  ).join("\n");

  const prompt = `Sei un esperto di patente di guida italiana. Per ogni domanda seguente, fornisci:
1. Traduzione in arabo (textAR)
2. Spiegazione breve in italiano del perché è vero/falso (explanationIT, max 2 frasi)
3. Spiegazione breve in arabo (explanationAR, max 2 frasi)

Rispondi SOLO con un JSON array. Ogni elemento ha: {"textAR": "...", "explanationIT": "...", "explanationAR": "..."}
NON aggiungere testo prima o dopo il JSON. Usa numeri occidentali (0123456789), MAI numeri arabi orientali.

Domande:
${questionsText}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Extract JSON from response
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const translations = JSON.parse(jsonStr);

    if (translations.length !== batch.length) {
      console.log(`  WARN batch ${batchNum}: got ${translations.length} translations for ${batch.length} questions`);
    }

    // Apply translations
    let applied = 0;
    for (let i = 0; i < Math.min(translations.length, batch.length); i++) {
      const t = translations[i];
      const q = batch[i];
      if (t.textAR) q.textAR = t.textAR;
      if (t.explanationIT) q.explanationIT = t.explanationIT;
      if (t.explanationAR) q.explanationAR = t.explanationAR;
      applied++;
    }

    console.log(`  Batch ${batchNum}/${batches.length}: ${applied} tradotte`);
    return applied;
  } catch (err) {
    console.error(`  ERRORE batch ${batchNum}:`, err.message);
    return 0;
  }
}

async function main() {
  let totalTranslated = 0;

  for (let i = 0; i < batches.length; i++) {
    const count = await translateBatch(batches[i], i + 1);
    totalTranslated += count;

    // Rate limit: wait 1s between batches
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save
  fs.writeFileSync("content/source/questions.json", JSON.stringify(qs, null, 2), "utf-8");

  // Verify
  const stillIncomplete = qs.filter(q => !q.textAR || !q.explanationIT || !q.explanationAR);

  console.log("\n=== RISULTATO ===");
  console.log("Tradotte:", totalTranslated);
  console.log("Ancora incomplete:", stillIncomplete.length);

  // Sample
  console.log("\n=== CAMPIONE (3 random tradotte) ===");
  const sample = incomplete.filter(q => q.textAR).sort(() => Math.random() - 0.5).slice(0, 3);
  for (const s of sample) {
    console.log(`  ${s.code}: ${s.textIT.substring(0, 60)}`);
    console.log(`    AR: ${s.textAR.substring(0, 60)}`);
    console.log(`    ExplIT: ${(s.explanationIT || "").substring(0, 60)}`);
  }

  if (stillIncomplete.length === 0) {
    console.log("\n=== VERDETTO: PASS - tutte tradotte ===");
  } else {
    console.log("\n=== VERDETTO: " + stillIncomplete.length + " ancora incomplete ===");
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
