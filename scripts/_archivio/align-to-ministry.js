const fs = require("fs");

// === LOAD DATA ===
const ours = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));
const ministry = JSON.parse(fs.readFileSync("scripts/output/quiz-ministeriali-github.json", "utf-8"));
const chapters = JSON.parse(fs.readFileSync("content/source/chapters.json", "utf-8"));

// Backup
fs.writeFileSync("content/source/questions-backup-pre-align.json", JSON.stringify(ours, null, 2), "utf-8");
fs.writeFileSync("content/source/chapters-backup-pre-align.json", JSON.stringify(chapters, null, 2), "utf-8");
console.log("Backup salvati");

// === FLATTEN MINISTERIAL ===
const ministryFlat = [];
for (const [argSlug, topics] of Object.entries(ministry)) {
  for (const [topicSlug, questions] of Object.entries(topics)) {
    for (const q of questions) {
      ministryFlat.push({
        text: q.q,
        answer: q.a,
        img: q.img || "",
        argSlug,
        topicSlug
      });
    }
  }
}

// === NORMALIZE ===
const normalize = t => t.toLowerCase()
  .replace(/[''`]/g, "'")
  .replace(/[^a-zàèéìòùa-z0-9']/g, "")
  .trim();

// === STEP 1: Map ministerial 25 args to chapterId ===
const argToChapterId = {
  "definizioni-generali-doveri-strada": 1,
  "segnali-pericolo": 2,
  "segnali-divieto": 3,
  "segnali-obbligo": 4,
  "segnali-precedenza": 5,
  "segnaletica-orizzontale-ostacoli": 6,
  "semafori-vigili": 7,
  "segnali-indicazione": 8,
  "segnali-complementari-cantiere": 9,
  "pannelli-integrativi": 10,
  "limiti-di-velocita": 11,
  "distanza-di-sicurezza": 12,
  "norme-di-circolazione": 13,
  "precedenza-incroci": 14,
  "sorpasso": 15,
  "fermata-sosta-arresto": 16,
  "norme-varie-autostrade-pannelli": 17,
  "luci-dispositivi-acustici": 18,
  "cinture-casco-sicurezza": 19,
  "patente-punti-documenti": 20,
  "incidenti-stradali-comportamenti": 21,
  "alcool-droga-primo-soccorso": 22,
  "responsabilita-civile-penale-e-assicurazione": 23,
  "consumi-ambiente-inquinamento": 24,
  "elementi-veicolo-manutenzione-comportamenti": 25
};

// Ministerial arg names for chapters
const argNames = {
  1: { nameIT: "Definizioni generali e doveri nell'uso della strada", nameAR: "التعريفات العامة وواجبات استخدام الطريق" },
  2: { nameIT: "Segnali di pericolo", nameAR: "إشارات الخطر" },
  3: { nameIT: "Segnali di divieto", nameAR: "إشارات الحظر" },
  4: { nameIT: "Segnali di obbligo", nameAR: "إشارات الإلزام" },
  5: { nameIT: "Segnali di precedenza", nameAR: "إشارات الأولوية" },
  6: { nameIT: "Segnaletica orizzontale e segni sugli ostacoli", nameAR: "العلامات الأرضية وعلامات العوائق" },
  7: { nameIT: "Segnalazioni semaforiche e degli agenti del traffico", nameAR: "إشارات المرور الضوئية وإشارات رجال المرور" },
  8: { nameIT: "Segnali di indicazione", nameAR: "إشارات الإرشاد" },
  9: { nameIT: "Segnali complementari, segnali temporanei e di cantiere", nameAR: "إشارات تكميلية وإشارات مؤقتة وأعمال الطريق" },
  10: { nameIT: "Pannelli integrativi dei segnali", nameAR: "اللوحات التكميلية للإشارات" },
  11: { nameIT: "Limiti di velocità, pericolo e intralcio alla circolazione", nameAR: "حدود السرعة والخطر وعرقلة حركة المرور" },
  12: { nameIT: "Distanza di sicurezza", nameAR: "مسافة الأمان" },
  13: { nameIT: "Norme sulla circolazione dei veicoli", nameAR: "قواعد سير المركبات" },
  14: { nameIT: "Esempi di precedenza (ordine di precedenza agli incroci)", nameAR: "أمثلة على الأولوية (ترتيب الأولوية عند التقاطعات)" },
  15: { nameIT: "Norme sul sorpasso", nameAR: "قواعد التجاوز" },
  16: { nameIT: "Fermata, sosta, arresto e partenza", nameAR: "التوقف المؤقت والوقوف والتوقف التام والانطلاق" },
  17: { nameIT: "Norme varie (ingombro, autostrade, trasporto, pannelli veicoli)", nameAR: "قواعد متنوعة (عرقلة الطريق، الطرق السريعة، نقل الأشخاص، لوحات المركبات)" },
  18: { nameIT: "Uso delle luci e dei dispositivi acustici, spie e simboli", nameAR: "استخدام الأضواء والأجهزة الصوتية والرموز" },
  19: { nameIT: "Dispositivi di equipaggiamento: cinture, sistemi di ritenuta, casco", nameAR: "أجهزة التجهيز: أحزمة الأمان وأنظمة الحماية والخوذة" },
  20: { nameIT: "Patenti di guida, sistema sanzionatorio, documenti e obblighi", nameAR: "رخص القيادة ونظام العقوبات والوثائق والالتزامات" },
  21: { nameIT: "Incidenti stradali e comportamenti in caso di incidente", nameAR: "حوادث المرور والسلوك في حالة وقوع حادث" },
  22: { nameIT: "Guida in relazione a qualità fisiche e psichiche, alcol, droga", nameAR: "القيادة والحالة الجسدية والنفسية والكحول والمخدرات" },
  23: { nameIT: "Responsabilità civile, penale e amministrativa, assicurazione", nameAR: "المسؤولية المدنية والجنائية والإدارية والتأمين" },
  24: { nameIT: "Limitazione dei consumi, rispetto dell'ambiente e inquinamento", nameAR: "تقليل الاستهلاك واحترام البيئة والتلوث" },
  25: { nameIT: "Elementi del veicolo, manutenzione, stabilità e tenuta di strada", nameAR: "عناصر المركبة والصيانة والاستقرار والتماسك على الطريق" }
};

// === STEP 2: Build ministry text set for identifying our extras ===
const ministryTexts = new Map();
for (const mq of ministryFlat) {
  ministryTexts.set(normalize(mq.text), mq);
}

// === STEP 3: Keep only questions that exist in ministerial DB ===
const kept = [];
const removed = [];
for (const q of ours) {
  const n = normalize(q.textIT);
  if (ministryTexts.has(n)) {
    const mq = ministryTexts.get(n);
    // Update chapterId to match ministerial mapping
    q.chapterId = argToChapterId[mq.argSlug];
    kept.push(q);
    ministryTexts.delete(n); // Mark as matched
  } else {
    removed.push(q);
  }
}

console.log("\nSTEP 1 - Filtraggio:");
console.log("  Mantenute (ministeriali):", kept.length);
console.log("  Rimosse (extra):", removed.length);

// === STEP 4: Add missing ministerial questions ===
// Remaining in ministryTexts are the ones we don't have
const missing = [...ministryTexts.values()];
console.log("  Mancanti da aggiungere:", missing.length);

// Find max code number from kept
let maxCode = 0;
for (const q of kept) {
  const num = parseInt(q.code.replace(/[^0-9]/g, ""), 10);
  if (num > maxCode) maxCode = num;
}

const added = [];
let codeNum = maxCode + 1;
for (const mq of missing) {
  const topicKey = mq.topicSlug.replace(/-/g, "_");
  const code = "M" + String(codeNum).padStart(5, "0"); // M for ministeriale
  codeNum++;

  added.push({
    chapterId: argToChapterId[mq.argSlug],
    topicKey,
    textIT: mq.text,
    explanationIT: "",
    imageUrl: mq.img || "",
    textAR: "",
    code,
    explanationAR: "",
    isTrue: mq.answer
  });
}

// === STEP 5: Merge ===
const final = [...kept, ...added];
console.log("\nSTEP 2 - Risultato:");
console.log("  Totale finale:", final.length);
console.log("  (atteso 7139, differenza:", final.length - 7139, ")");

// === STEP 6: Build new 25 chapters ===
const newChapters = [];
for (let i = 1; i <= 25; i++) {
  const count = final.filter(q => q.chapterId === i).length;
  newChapters.push({
    id: i,
    nameIT: argNames[i].nameIT,
    nameAR: argNames[i].nameAR,
    questionCount: count
  });
}

// === STEP 7: Verify ===
console.log("\n=== CONTEGGIO PER ARGOMENTO ===");
let totalVerified = 0;
let emptyCount = 0;
const argSlugs = Object.keys(argToChapterId);
for (const ch of newChapters) {
  const ministryCount = ministryFlat.filter(q => argToChapterId[q.argSlug] === ch.id).length;
  const status = ch.questionCount === ministryCount ? "OK" : "DIFF";
  console.log(
    "  " + String(ch.id).padStart(2) + ". " +
    ch.nameIT.substring(0, 55).padEnd(55) +
    String(ch.questionCount).padStart(5) + " / " +
    String(ministryCount).padStart(5) +
    " " + status
  );
  totalVerified += ch.questionCount;
  if (ch.questionCount === 0) emptyCount++;
}

// Questions needing translation
const needTranslation = final.filter(q => !q.textAR).length;
const needExplIT = final.filter(q => !q.explanationIT).length;

console.log("\n=== COMPLETEZZA ===");
console.log("  Da tradurre (textAR):", needTranslation);
console.log("  Da spiegare (explanationIT):", needExplIT);
console.log("  Già complete:", final.length - needTranslation);

// Save
fs.writeFileSync("content/source/questions.json", JSON.stringify(final, null, 2), "utf-8");
fs.writeFileSync("content/source/chapters.json", JSON.stringify(newChapters, null, 2), "utf-8");

// Save removed for reference
fs.writeFileSync("content/source/questions-removed-extras.json", JSON.stringify(removed, null, 2), "utf-8");

console.log("\n=== VERDETTO ===");
if (final.length === 7139 && emptyCount === 0) {
  console.log("PASS - 7.139 domande ministeriali, 25 argomenti, allineamento completo");
} else if (emptyCount === 0) {
  console.log("QUASI - " + final.length + " domande (diff " + (final.length - 7139) + "), 0 argomenti vuoti");
  console.log("La differenza potrebbe essere dovuta a normalizzazione testo (accenti/spazi)");
} else {
  console.log("FAIL - " + emptyCount + " argomenti vuoti");
}

// Sample of added
console.log("\n=== CAMPIONE AGGIUNTE (3) ===");
const sampleAdded = added.sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sampleAdded) {
  console.log("  " + s.code + " [Arg" + s.chapterId + "|" + s.topicKey + "]");
  console.log("    \"" + s.textIT.substring(0, 90) + "\"");
}

// Sample of removed
console.log("\n=== CAMPIONE RIMOSSE (3) ===");
const sampleRemoved = removed.sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sampleRemoved) {
  console.log("  " + s.code + " [Cap" + s.chapterId + "|" + s.topicKey + "]");
  console.log("    \"" + s.textIT.substring(0, 90) + "\"");
}
