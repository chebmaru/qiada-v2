const fs = require("fs");

// Load data
const existing = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const missing = JSON.parse(fs.readFileSync(
  "../patente-arabi/scripts/output/_archivio/truly-missing-questions.json", "utf-8"
));
const topics = JSON.parse(fs.readFileSync("content/source/topics.json", "utf-8"));
const chapters = JSON.parse(fs.readFileSync("content/source/chapters.json", "utf-8"));

// Normalize for dedup
const normalize = t => t.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, "").trim();
const existingTexts = new Set(existing.map(q => normalize(q.textIT)));

// Filter truly new
const newOnes = missing.filter(q => !existingTexts.has(normalize(q.text)));
console.log(`Domande nuove da importare: ${newOnes.length}`);

// Chapter slug → chapterId mapping
const chapterMap = {
  "definizioni-generali-doveri-strada": 1,
  "segnali-pericolo": 2,
  "segnali-precedenza": 3,
  "segnali-divieto": 4,
  "segnali-obbligo": 5,
  "segnali-indicazione": 6,
  "segnali-complementari-cantiere": 7, // Now mapped to cap 7
  "pannelli-integrativi": 9,
  "semafori-vigili": 10,
  "segnaletica-orizzontale-ostacoli": 11,
  "limiti-di-velocita": 12,
  "distanza-di-sicurezza": 12,
  "norme-di-circolazione": 13,
  "precedenza-incroci": 14,
  "sorpasso": 15,
  "fermata-sosta-arresto": 16,
  "norme-varie-autostrade-pannelli": 18,
  "luci-dispositivi-acustici": 19,
  "cinture-casco-sicurezza": 21,
  "patente-punti-documenti": 23,
  "incidenti-stradali-comportamenti": 26,
  "alcool-droga-primo-soccorso": 27,
  "responsabilita-civile-penale-e-assicurazione": 26,
  "consumi-ambiente-inquinamento": 28,
  "elementi-veicolo-manutenzione-comportamenti": 29
};

// Topic slug → topicKey mapping (best effort from existing topics)
const topicKeys = new Set(topics.map(t => t.topicKey));

function slugToTopicKey(slug) {
  // Convert kebab-case to snake_case
  const snake = slug.replace(/-/g, "_");
  if (topicKeys.has(snake)) return snake;

  // Try common variations
  const variations = [
    snake,
    snake.replace(/_/g, ""),
    // Remove common prefixes
    snake.replace(/^segnale_/, ""),
    snake.replace(/^segnali_/, ""),
  ];
  for (const v of variations) {
    if (topicKeys.has(v)) return v;
  }

  // Fuzzy match - find best matching topicKey
  let best = null;
  let bestScore = 0;
  for (const tk of topicKeys) {
    const words = snake.split("_");
    const score = words.filter(w => tk.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = tk;
    }
  }
  return best || snake;
}

// Assign codes - find max existing code number
const maxCode = existing.reduce((max, q) => {
  const num = parseInt(q.code.replace(/[^0-9]/g, ""), 10);
  return num > max ? num : max;
}, 0);
console.log(`Ultimo codice esistente: ${maxCode}`);

// Build new questions
const imported = [];
let codeNum = maxCode + 1;

for (const q of newOnes) {
  const chapterId = chapterMap[q.chapter] || 1;
  const topicKey = slugToTopicKey(q.topic);
  const code = "N" + String(codeNum).padStart(5, "0"); // N prefix for "new"
  codeNum++;

  imported.push({
    chapterId,
    topicKey,
    textIT: q.text,
    explanationIT: "", // TODO: generate with AI
    imageUrl: q.img || "",
    textAR: "", // TODO: translate with AI
    code,
    explanationAR: "", // TODO: generate with AI
    isTrue: q.answer
  });
}

// Stats
console.log(`\nImportate: ${imported.length} domande`);
console.log(`Codici: N${String(maxCode + 1).padStart(5, "0")} → N${String(codeNum - 1).padStart(5, "0")}`);

const byCap = {};
for (const q of imported) {
  byCap[q.chapterId] = (byCap[q.chapterId] || 0) + 1;
}
console.log("\nPer capitolo:");
for (const [c, n] of Object.entries(byCap).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`  Cap ${c}: ${n}`);
}

// How many need translation?
const needTranslation = imported.filter(q => !q.textAR).length;
const needExplIT = imported.filter(q => !q.explanationIT).length;
console.log(`\nDa tradurre (textAR): ${needTranslation}`);
console.log(`Da spiegare (explanationIT): ${needExplIT}`);

// Save imported separately first for review
fs.writeFileSync("content/source/questions-new-242.json", JSON.stringify(imported, null, 2), "utf-8");
console.log("\nSalvate in: questions-new-242.json (da revisionare prima di unire)");

// Sample
console.log("\n=== CAMPIONE (3 random) ===");
const sample = imported.sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sample) {
  console.log(`  ${s.code} [Cap${s.chapterId}|${s.topicKey}]`);
  console.log(`    "${s.textIT.substring(0, 90)}"`);
  console.log(`    isTrue: ${s.isTrue}`);
}

// VERDETTO
console.log("\n=== VERDETTO ===");
if (imported.length === 242) {
  console.log("PASS - 242 domande nuove pronte");
  console.log("PROSSIMO STEP: tradurre textAR + generare explanationIT/AR con AI");
} else {
  console.log(`ATTENZIONE - ${imported.length} invece di 242 attese`);
}
