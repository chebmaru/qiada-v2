const fs = require("fs");

// Load our dataset
const ours = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));

// Load ministerial database
const ministry = JSON.parse(fs.readFileSync("scripts/output/quiz-ministeriali-github.json", "utf-8"));

// Flatten ministerial into array
const ministryFlat = [];
for (const [argSlug, topics] of Object.entries(ministry)) {
  for (const [topicSlug, questions] of Object.entries(topics)) {
    for (const q of questions) {
      ministryFlat.push({
        text: q.q,
        answer: q.a,
        img: q.img || "",
        chapter: argSlug,
        topic: topicSlug
      });
    }
  }
}

console.log("Nostre domande:", ours.length);
console.log("Ministeriali:", ministryFlat.length);

// Normalize for matching
const normalize = t => t.toLowerCase()
  .replace(/[''`]/g, "'")
  .replace(/[^a-zàèéìòùa-z0-9']/g, "")
  .trim();

const ourTexts = new Set(ours.map(q => normalize(q.textIT)));

// Find missing
const missing = ministryFlat.filter(q => !ourTexts.has(normalize(q.text)));
const found = ministryFlat.filter(q => ourTexts.has(normalize(q.text)));

console.log("\nGià presenti:", found.length);
console.log("MANCANTI:", missing.length);

// Missing per chapter
const byChap = {};
for (const q of missing) {
  byChap[q.chapter] = (byChap[q.chapter] || 0) + 1;
}
console.log("\nMancanti per argomento:");
for (const [c, n] of Object.entries(byChap).sort((a, b) => b[1] - a[1])) {
  console.log("  " + c.substring(0, 55) + ": " + n);
}

// Also check: do we have questions NOT in the ministerial DB?
const ministryTexts = new Set(ministryFlat.map(q => normalize(q.text)));
const extras = ours.filter(q => !ministryTexts.has(normalize(q.textIT)));
console.log("\nNostre domande NON nel ministeriale:", extras.length);

// Sample missing
console.log("\n=== CAMPIONE MANCANTI (5 random) ===");
const sample = missing.sort(() => Math.random() - 0.5).slice(0, 5);
for (const s of sample) {
  console.log("  [" + s.chapter + "/" + s.topic + "]");
  console.log("    " + s.text.substring(0, 100));
  console.log("    Risposta: " + s.answer);
}

// Save missing to file
fs.writeFileSync("content/source/questions-missing-from-ministry.json", JSON.stringify(missing, null, 2), "utf-8");
console.log("\nSalvate in: questions-missing-from-ministry.json");

console.log("\n=== VERDETTO ===");
console.log("Ministeriali totali: " + ministryFlat.length);
console.log("Nostre: " + ours.length);
console.log("Mancanti: " + missing.length);
console.log("Extra nostre: " + extras.length);
console.log("Copertura: " + (found.length / ministryFlat.length * 100).toFixed(1) + "%");
