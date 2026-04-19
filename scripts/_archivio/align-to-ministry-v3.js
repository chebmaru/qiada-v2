const fs = require("fs");

const ours = JSON.parse(fs.readFileSync("content/source/questions-backup-pre-align.json", "utf-8"));
const ministry = JSON.parse(fs.readFileSync("scripts/output/quiz-ministeriali-github.json", "utf-8"));

console.log("Originali nostre:", ours.length);

// Flatten ministerial
const ministryFlat = [];
for (const [argSlug, topics] of Object.entries(ministry)) {
  for (const [topicSlug, questions] of Object.entries(topics)) {
    for (const q of questions) {
      ministryFlat.push({
        text: q.q, answer: q.a, img: q.img || "",
        argSlug, topicSlug
      });
    }
  }
}
console.log("Ministeriali:", ministryFlat.length);

const normalize = t => t.toLowerCase()
  .replace(/[''`']/g, "")
  .replace(/è/g, "e").replace(/é/g, "e").replace(/à/g, "a")
  .replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u")
  .replace(/[^a-z0-9]/g, "").trim();

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

// === Build ministry lookup: norm -> ministry question ===
const ministryByNorm = new Map();
for (const mq of ministryFlat) {
  const n = normalize(mq.text);
  if (!ministryByNorm.has(n)) {
    ministryByNorm.set(n, mq);
  }
}
console.log("Ministeriali unici (per testo):", ministryByNorm.size);

// === MATCH: For each ministerial question, find the BEST match from ours ===
// Strategy: for each ministerial question, pick the first matching question from ours
// This ensures 1:1 mapping and no duplicates

const ourByNorm = new Map();
for (const q of ours) {
  const n = normalize(q.textIT);
  if (!ourByNorm.has(n)) {
    ourByNorm.set(n, []);
  }
  ourByNorm.get(n).push(q);
}

// Count our duplicates
let ourDupes = 0;
for (const [n, arr] of ourByNorm) {
  if (arr.length > 1) ourDupes += arr.length - 1;
}
console.log("Nostri duplicati (stesso testo):", ourDupes);

const final = [];
const usedCodes = new Set();
let matchedCount = 0;
let addedCount = 0;

// For each ministerial question
for (const [mNorm, mq] of ministryByNorm) {
  const ourMatches = ourByNorm.get(mNorm);
  if (ourMatches && ourMatches.length > 0) {
    // Pick the first unused one (prefer ones with translations)
    const best = ourMatches.find(q => !usedCodes.has(q.code) && q.textAR) ||
                 ourMatches.find(q => !usedCodes.has(q.code)) ||
                 ourMatches[0];

    best.chapterId = argToChapterId[mq.argSlug]; // Align chapter
    final.push(best);
    usedCodes.add(best.code);
    matchedCount++;
  } else {
    // Not found — add as new
    const topicKey = mq.topicSlug.replace(/-/g, "_");
    const code = "M" + String(addedCount + 1).padStart(5, "0");
    final.push({
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
    addedCount++;
  }
}

// Removed = our questions not used
const removed = ours.filter(q => !usedCodes.has(q.code));

console.log("\n=== RISULTATO ===");
console.log("Matched da nostre:", matchedCount);
console.log("Aggiunte nuove:", addedCount);
console.log("Rimosse:", removed.length);
console.log("TOTALE FINALE:", final.length);
console.log("ATTESO:", ministryByNorm.size);

// Build chapters
const newChapters = [];
for (let i = 1; i <= 25; i++) {
  const count = final.filter(q => q.chapterId === i).length;
  const expected = ministryFlat.filter(q => argToChapterId[q.argSlug] === i).length;
  newChapters.push({
    id: i,
    nameIT: argNames[i].nameIT,
    nameAR: argNames[i].nameAR,
    questionCount: count
  });
}

console.log("\n=== CONTEGGIO PER ARGOMENTO ===");
for (const ch of newChapters) {
  const expected = ministryFlat.filter(q => argToChapterId[q.argSlug] === ch.id).length;
  const diff = ch.questionCount - expected;
  const status = diff === 0 ? "OK" : (diff > 0 ? "+" + diff : String(diff));
  console.log(
    String(ch.id).padStart(2) + ". " +
    ch.nameIT.substring(0, 55).padEnd(55) +
    String(ch.questionCount).padStart(5) + " / " +
    String(expected).padStart(5) + " " + status
  );
}

const needTranslation = final.filter(q => !q.textAR).length;
const complete = final.filter(q => q.textAR && q.explanationIT && q.explanationAR).length;

console.log("\nCompletezza:");
console.log("  Complete (IT+AR+spiegazioni):", complete);
console.log("  Da tradurre/spiegare:", needTranslation);

// Save
fs.writeFileSync("content/source/questions.json", JSON.stringify(final, null, 2), "utf-8");
fs.writeFileSync("content/source/chapters.json", JSON.stringify(newChapters, null, 2), "utf-8");
fs.writeFileSync("content/source/questions-removed-extras.json", JSON.stringify(removed, null, 2), "utf-8");

console.log("\n=== VERDETTO ===");
if (final.length === ministryByNorm.size) {
  console.log("PASS PERFETTO - " + final.length + " domande = database ministeriale");
} else {
  console.log("DIFF: " + final.length + " vs " + ministryByNorm.size + " attese");
}

// Sample
console.log("\n=== CAMPIONE AGGIUNTE (3) ===");
const sampleAdded = final.filter(q => q.code.startsWith("M")).sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sampleAdded) {
  console.log("  " + s.code + " [Arg" + s.chapterId + "] " + s.textIT.substring(0, 90));
}

console.log("\n=== CAMPIONE RIMOSSE (3) ===");
const sampleRemoved = removed.sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sampleRemoved) {
  console.log("  " + s.code + " [Cap" + s.chapterId + "] " + s.textIT.substring(0, 90));
}
