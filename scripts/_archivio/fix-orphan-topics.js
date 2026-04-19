const fs = require("fs");
const topics = JSON.parse(fs.readFileSync("content/source/topics.json", "utf-8"));
const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));

// Find orphan topicKeys
const topicKeys = new Set(topics.map(t => t.topicKey));
const orphanQuestions = qs.filter(q => q.topicKey && !topicKeys.has(q.topicKey));
const orphanTopicKeys = [...new Set(orphanQuestions.map(q => q.topicKey))];

console.log("TopicKey orfani:", orphanTopicKeys.length);

// Create new topics for orphans
let maxId = Math.max(...topics.map(t => t.id || 0));
const newTopics = [];

for (const tk of orphanTopicKeys) {
  maxId++;
  const questionsForTopic = qs.filter(q => q.topicKey === tk);
  const chapterId = questionsForTopic[0].chapterId;

  // Generate title from topicKey
  const titleIT = tk.replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^Figura /, "Figura ");

  newTopics.push({
    id: maxId,
    topicKey: tk,
    chapterId,
    titleIT,
    titleAR: "", // TODO: translate
    contentIT: "",
    contentAR: "",
    questionCount: questionsForTopic.length
  });
}

// Merge
const allTopics = [...topics, ...newTopics];
fs.writeFileSync("content/source/topics.json", JSON.stringify(allTopics, null, 2), "utf-8");

console.log("Nuovi topics creati:", newTopics.length);
console.log("Topics totali:", allTopics.length);

// Verify no more orphans
const allKeys = new Set(allTopics.map(t => t.topicKey));
const remaining = qs.filter(q => q.topicKey && !allKeys.has(q.topicKey));
console.log("Domande ancora orfane:", remaining.length);

// Stats
const withQ = allTopics.filter(t => t.questionCount > 0).length;
console.log("Topics con domande:", withQ);
console.log("Topics senza domande:", allTopics.length - withQ);
