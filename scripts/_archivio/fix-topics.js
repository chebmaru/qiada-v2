const fs = require("fs");
const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const topics = JSON.parse(fs.readFileSync("content/source/topics.json", "utf-8"));

// Remove the strettoia duplicate only
const cleaned = topics.filter(t => t.topicKey !== "strettoia_asimmetrica_a_destra");

// Fix questionCount for all topics
for (const t of cleaned) {
  t.questionCount = qs.filter(q => q.topicKey === t.topicKey).length;
}

fs.writeFileSync("content/source/topics.json", JSON.stringify(cleaned, null, 2), "utf-8");

const withQ = cleaned.filter(t => t.questionCount > 0).length;
const withoutQ = cleaned.filter(t => t.questionCount === 0).length;
const withContent = cleaned.filter(t => t.questionCount === 0 && (t.contentIT || t.contentAR)).length;

console.log("Total:", cleaned.length);
console.log("Con domande:", withQ);
console.log("Senza domande ma con contenuto didattico:", withContent);
console.log("Senza domande e senza contenuto:", withoutQ - withContent);

// Verify coverage
const topicKeys = new Set(cleaned.map(t => t.topicKey));
const orphans = qs.filter(q => q.topicKey && !topicKeys.has(q.topicKey));
console.log("Domande orfane:", orphans.length);
