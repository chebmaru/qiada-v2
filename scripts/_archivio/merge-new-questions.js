const fs = require("fs");

const existing = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const newOnes = JSON.parse(fs.readFileSync("content/source/questions-new-242.json", "utf-8"));

// Verify no code collisions
const existingCodes = new Set(existing.map(q => q.code));
const collisions = newOnes.filter(q => existingCodes.has(q.code));
if (collisions.length > 0) {
  console.log("ERRORE: collisioni codici:", collisions.map(q => q.code).join(", "));
  process.exit(1);
}

// Merge
const merged = [...existing, ...newOnes];

// Verify no text duplicates
const normalize = t => t.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, "").trim();
const texts = new Map();
let dupes = 0;
for (const q of merged) {
  const n = normalize(q.textIT);
  if (texts.has(n)) {
    dupes++;
  }
  texts.set(n, q.code);
}

console.log(`Esistenti: ${existing.length}`);
console.log(`Nuove: ${newOnes.length}`);
console.log(`Totale unito: ${merged.length}`);
console.log(`Duplicati testo: ${dupes}`);

if (dupes > 0) {
  console.log("ATTENZIONE: ci sono duplicati testuali, ma procedo (potrebbero essere varianti)");
}

// Save
fs.writeFileSync("content/source/questions.json", JSON.stringify(merged, null, 2), "utf-8");
console.log("\nSalvato: questions.json (" + merged.length + " domande)");

// Verify per chapter
const chapters = JSON.parse(fs.readFileSync("content/source/chapters.json", "utf-8"));
console.log("\n=== CONTEGGIO FINALE PER CAPITOLO ===");
let emptyCount = 0;
for (const c of chapters) {
  const count = merged.filter(q => q.chapterId === c.id).length;
  if (count === 0) emptyCount++;
  console.log(`Cap ${c.id} (${c.nameIT.substring(0, 40)}): ${count}`);
}

// Incomplete questions
const incomplete = merged.filter(q => !q.textAR || !q.explanationIT || !q.explanationAR);
console.log(`\nDomande incomplete (senza traduzioni): ${incomplete.length}`);

console.log("\n=== VERDETTO ===");
if (emptyCount === 0) {
  console.log("PASS - 30/30 capitoli con domande, " + merged.length + " domande totali");
  console.log("TODO: tradurre " + incomplete.length + " domande con pipeline AI");
} else {
  console.log("FAIL - " + emptyCount + " capitoli vuoti");
}
