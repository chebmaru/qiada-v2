import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const qs = JSON.parse(fs.readFileSync(path.join(root, 'content/source/questions.json'), 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));
const glossary = JSON.parse(fs.readFileSync(path.join(root, 'content/source/glossary.json'), 'utf-8'));

// Pick: dare_precedenza
const topic = topics.find(t => t.topicKey === 'dare_precedenza');
const topicQs = qs.filter(q => q.topicKey === 'dare_precedenza');

const example = {
  topic: {
    topicKey: topic.topicKey,
    titleIT: topic.titleIT,
    titleAR: topic.titleAR,
    contentIT: (topic.contentIT || '').substring(0, 800),
    contentAR: (topic.contentAR || '').substring(0, 800),
    imageUrl: topic.imageUrl,
    chapterId: topic.chapterId,
    questionCount: topicQs.length
  },
  questions: topicQs.slice(0, 10).map(q => ({
    code: q.code,
    textIT: q.textIT,
    textAR: q.textAR,
    explanationIT: q.explanationIT,
    explanationAR: q.explanationAR,
    isTrue: q.isTrue,
    imageUrl: q.imageUrl
  })),
  tricks: {
    titleIT: "Trucchi V/F \u2014 Dare Precedenza",
    titleAR: "\u062d\u064a\u0644 \u0635\u062d/\u062e\u0637\u0623 \u2014 \u0623\u0639\u0637\u0650 \u0627\u0644\u0623\u0648\u0644\u0648\u064a\u0629",
    rules: [
      {
        ruleIT: "Se la domanda dice 'il segnale OBBLIGA a fermarsi' \u2192 FALSO (il triangolo NON obbliga a fermarsi, quello \u00e8 lo STOP)",
        ruleAR: "\u0625\u0630\u0627 \u0642\u0627\u0644\u062a \u0627\u0644\u062c\u0645\u0644\u0629 \"\u0627\u0644\u0625\u0634\u0627\u0631\u0629 \u062a\u064f\u0644\u0632\u0645 \u0628\u0627\u0644\u062a\u0648\u0642\u0641\" \u2190 \u062e\u0637\u0623 (\u0627\u0644\u0645\u062b\u0644\u062b \u0627\u0644\u0623\u062d\u0645\u0631 \u0644\u0627 \u064a\u064f\u0644\u0632\u0645 \u0628\u0627\u0644\u062a\u0648\u0642\u0641\u060c \u0647\u0630\u0627 \u0647\u0648 \u0625\u0634\u0627\u0631\u0629 \u0642\u0641)",
        keywords: ["fermarsi", "arrestarsi", "obbliga"]
      },
      {
        ruleIT: "Se la domanda dice 'rallentare e se necessario fermarsi' \u2192 VERO (il segnale impone di rallentare)",
        ruleAR: "\u0625\u0630\u0627 \u0642\u0627\u0644\u062a \u0627\u0644\u062c\u0645\u0644\u0629 \"\u062a\u062e\u0641\u064a\u0641 \u0627\u0644\u0633\u0631\u0639\u0629 \u0648\u0627\u0644\u062a\u0648\u0642\u0641 \u0625\u0630\u0627 \u0644\u0632\u0645 \u0627\u0644\u0623\u0645\u0631\" \u2190 \u0635\u062d",
        keywords: ["rallentare", "se necessario"]
      },
      {
        ruleIT: "Se la domanda dice 'vale solo nelle strade urbane/extraurbane' \u2192 FALSO (il segnale vale ovunque)",
        ruleAR: "\u0625\u0630\u0627 \u0642\u0627\u0644\u062a \u0627\u0644\u062c\u0645\u0644\u0629 \"\u062a\u0633\u0631\u064a \u0641\u0642\u0637 \u0641\u064a \u0627\u0644\u0637\u0631\u0642 \u0627\u0644\u062d\u0636\u0631\u064a\u0629\" \u2190 \u062e\u0637\u0623 (\u0627\u0644\u0625\u0634\u0627\u0631\u0629 \u062a\u0633\u0631\u064a \u0641\u064a \u0643\u0644 \u0645\u0643\u0627\u0646)",
        keywords: ["solo", "urbane", "extraurbane"]
      }
    ]
  },
  glossary: glossary.filter(g => {
    const t = (g.termIT || g.termIt || '').toLowerCase();
    return t.includes('precedenza') || t.includes('incrocio') || t.includes('intersezione');
  }).slice(0, 5).map(g => ({
    termIT: g.termIT || g.termIt,
    termAR: g.termAR || g.termAr,
    definitionIT: g.definitionIT || g.definitionIt,
    definitionAR: g.definitionAR || g.definitionAr
  }))
};

const outPath = path.join(root, 'scripts/output/example-topic-complete.json');
fs.writeFileSync(outPath, JSON.stringify(example, null, 2), 'utf-8');
console.log('Written to:', outPath);
console.log('Questions:', example.questions.length);
console.log('Tricks:', example.tricks.rules.length);
console.log('Glossary:', example.glossary.length);
