const fs = require("fs");

const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const topics = JSON.parse(fs.readFileSync("content/source/topics.json", "utf-8"));
const chapters = JSON.parse(fs.readFileSync("content/source/chapters.json", "utf-8"));

// Codes
const codes = new Set(qs.map(q => q.code).filter(Boolean));
const noCodes = qs.filter(q => !q.code).length;

console.log("=== STATO DATASET V2 ===\n");
console.log("Domande totali:", qs.length);
console.log("Codici unici:", codes.size);
console.log("Senza codice:", noCodes);

// Chapters with 0 questions
const emptyChapters = [];
for (const c of chapters) {
  const count = qs.filter(q => q.chapterId === c.id).length;
  if (count === 0) emptyChapters.push(c);
}

console.log("\nCapitoli:", chapters.length);
console.log("Capitoli vuoti:", emptyChapters.length);
emptyChapters.forEach(c => console.log("  Cap " + c.id + ": " + c.nameIT));

// Topics
const withQ = topics.filter(t => t.questionCount > 0);
const withoutQ = topics.filter(t => t.questionCount === 0);
const withContent = withoutQ.filter(t => t.contentIT || t.contentAR);

console.log("\nArgomenti totali:", topics.length);
console.log("  con domande:", withQ.length);
console.log("  senza domande + contenuto:", withContent.length);
console.log("  completamente vuoti:", withoutQ.length - withContent.length);

// Content completeness
const noContentIT = topics.filter(t => !t.contentIT).length;
const noContentAR = topics.filter(t => !t.contentAR).length;
const noTitleAR = topics.filter(t => !t.titleAR).length;

console.log("\nCompletezza contenuto:");
console.log("  senza contentIT:", noContentIT);
console.log("  senza contentAR:", noContentAR);
console.log("  senza titleAR:", noTitleAR);

// Question completeness (correct field names: textAR, explanationIT, explanationAR)
const noTextAR = qs.filter(q => !q.textAR).length;
const noExplIT = qs.filter(q => !q.explanationIT).length;
const noExplAR = qs.filter(q => !q.explanationAR).length;
const noTopicKey = qs.filter(q => !q.topicKey).length;

console.log("\nCompletezza domande:");
console.log("  senza textAR:", noTextAR);
console.log("  senza explanationIT:", noExplIT);
console.log("  senza explanationAR:", noExplAR);
console.log("  senza topicKey:", noTopicKey);

// Images
const withImage = qs.filter(q => q.imageUrl).length;
console.log("\nDomande con immagine:", withImage);

console.log("\n=== VERDETTO ===");
if (emptyChapters.length > 0) {
  console.log("INCOMPLETO - " + emptyChapters.length + " capitoli senza domande");
} else {
  console.log("COMPLETO - tutti i capitoli hanno domande");
}
