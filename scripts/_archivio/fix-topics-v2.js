const fs = require("fs");
const topics = JSON.parse(fs.readFileSync("content/source/topics.json", "utf-8"));
const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));

// Fix questionCount
for (const t of topics) {
  t.questionCount = qs.filter(q => q.topicKey === t.topicKey).length;
}

// Fix chapterId based on questions
const topicChapter = {};
for (const q of qs) {
  if (!topicChapter[q.topicKey]) topicChapter[q.topicKey] = {};
  topicChapter[q.topicKey][q.chapterId] = (topicChapter[q.topicKey][q.chapterId] || 0) + 1;
}

for (const t of topics) {
  if (topicChapter[t.topicKey]) {
    const chapters = topicChapter[t.topicKey];
    const bestChapter = Object.entries(chapters).sort((a, b) => b[1] - a[1])[0][0];
    t.chapterId = parseInt(bestChapter);
  }
}

fs.writeFileSync("content/source/topics.json", JSON.stringify(topics, null, 2), "utf-8");

const withQ = topics.filter(t => t.questionCount > 0).length;
const withoutQ = topics.filter(t => t.questionCount === 0).length;
console.log("Topics totali:", topics.length);
console.log("Con domande:", withQ);
console.log("Senza domande:", withoutQ);

// Check orphan questions (topicKey not in topics)
const topicKeys = new Set(topics.map(t => t.topicKey));
const orphans = qs.filter(q => q.topicKey && !topicKeys.has(q.topicKey));
console.log("Domande orfane:", orphans.length);
if (orphans.length > 0) {
  const orphanTopics = [...new Set(orphans.map(q => q.topicKey))];
  console.log("TopicKey orfani:", orphanTopics.length);
  orphanTopics.slice(0, 10).forEach(tk => {
    const count = orphans.filter(q => q.topicKey === tk).length;
    console.log("  " + tk + ": " + count);
  });
}
