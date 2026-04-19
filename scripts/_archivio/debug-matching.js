const fs = require("fs");

const ours = JSON.parse(fs.readFileSync("content/source/questions-backup-pre-align.json", "utf-8"));
const ministry = JSON.parse(fs.readFileSync("scripts/output/quiz-ministeriali-github.json", "utf-8"));

// Flatten
const ministryFlat = [];
for (const [argSlug, topics] of Object.entries(ministry)) {
  for (const [topicSlug, questions] of Object.entries(topics)) {
    for (const q of questions) {
      ministryFlat.push({ text: q.q, argSlug, topicSlug });
    }
  }
}

// Different normalization levels
const norm1 = t => t.toLowerCase().replace(/[^a-zàèéìòù0-9]/g, "").trim(); // strict
const norm2 = t => t.toLowerCase()
  .replace(/è/g, "e").replace(/é/g, "e").replace(/à/g, "a").replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u")
  .replace(/[^a-z0-9]/g, "").trim(); // no accents
const norm3 = t => t.toLowerCase()
  .replace(/[''`']/g, "")
  .replace(/è/g, "e").replace(/é/g, "e").replace(/à/g, "a").replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u")
  .replace(/[^a-z0-9]/g, "")
  .replace(/\s+/g, "").trim(); // aggressive

const ourSet1 = new Set(ours.map(q => norm1(q.textIT)));
const ourSet2 = new Set(ours.map(q => norm2(q.textIT)));
const ourSet3 = new Set(ours.map(q => norm3(q.textIT)));

let miss1 = 0, miss2 = 0, miss3 = 0;
const stillMissing = [];
for (const mq of ministryFlat) {
  if (!ourSet1.has(norm1(mq.text))) miss1++;
  if (!ourSet2.has(norm2(mq.text))) miss2++;
  if (!ourSet3.has(norm3(mq.text))) {
    miss3++;
    stillMissing.push(mq);
  }
}

console.log("Missing con norm1 (strict):", miss1);
console.log("Missing con norm2 (no accents):", miss2);
console.log("Missing con norm3 (aggressive):", miss3);

// Show first 10 still missing with their closest match
console.log("\n=== Prime 10 mancanti dopo norm3 ===");
const ourTexts3 = ours.map(q => ({ text: q.textIT, norm: norm3(q.textIT) }));

for (const mq of stillMissing.slice(0, 10)) {
  const mn = norm3(mq.text);
  console.log("\nMINISTERIALE: " + mq.text.substring(0, 100));

  // Find closest match
  let bestScore = 0;
  let bestMatch = "";
  for (const our of ourTexts3) {
    // Simple substring match
    const shorter = mn.length < our.norm.length ? mn : our.norm;
    const longer = mn.length >= our.norm.length ? mn : our.norm;
    if (longer.includes(shorter)) {
      const score = shorter.length / longer.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = our.text;
      }
    }
  }
  if (bestScore > 0.8) {
    console.log("  SIMILE (" + (bestScore*100).toFixed(0) + "%): " + bestMatch.substring(0, 100));
  } else {
    console.log("  NESSUN MATCH TROVATO");
  }
}
