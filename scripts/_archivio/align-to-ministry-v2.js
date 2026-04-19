const fs = require("fs");

// === LOAD ===
const ours = JSON.parse(fs.readFileSync("content/source/questions-backup-pre-align.json", "utf-8"));
const ministry = JSON.parse(fs.readFileSync("scripts/output/quiz-ministeriali-github.json", "utf-8"));

console.log("Originali nostre:", ours.length);

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
console.log("Ministeriali totali:", ministryFlat.length);

// === NORMALIZATION ===
const normalize = t => t.toLowerCase()
  .replace(/[''`']/g, "")
  .replace(/è/g, "e").replace(/é/g, "e").replace(/à/g, "a")
  .replace(/ì/g, "i").replace(/ò/g, "o").replace(/ù/g, "u")
  .replace(/[^a-z0-9]/g, "")
  .trim();

// === MAP: 25 ministerial args -> chapterId ===
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

// === BUILD MINISTRY LOOKUP ===
const ministryByNorm = new Map();
for (const mq of ministryFlat) {
  ministryByNorm.set(normalize(mq.text), mq);
}

// === STEP 1: Match our questions to ministerial ===
const kept = [];
const removed = [];
const matchedMinistryNorms = new Set();

for (const q of ours) {
  const n = normalize(q.textIT);
  if (ministryByNorm.has(n)) {
    const mq = ministryByNorm.get(n);
    q.chapterId = argToChapterId[mq.argSlug]; // Align chapter
    kept.push(q);
    matchedMinistryNorms.add(n);
  } else {
    removed.push(q);
  }
}

console.log("\nMatched:", kept.length);
console.log("Removed:", removed.length);

// === STEP 2: Find missing ministerial ===
const missing = ministryFlat.filter(mq => {
  return !matchedMinistryNorms.has(normalize(mq.text));
});
console.log("Missing ministerial:", missing.length);

// Check for near-duplicates in our removed vs missing
// Some might match with even more aggressive norm
let recovered = 0;
const norm4 = t => t.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 50);
const removedMap = new Map(removed.map(q => [norm4(q.textIT), q]));

for (const mq of [...missing]) {
  const n4 = norm4(mq.text);
  if (removedMap.has(n4)) {
    const q = removedMap.get(n4);
    q.chapterId = argToChapterId[mq.argSlug];
    kept.push(q);
    removed.splice(removed.indexOf(q), 1);
    missing.splice(missing.indexOf(mq), 1);
    removedMap.delete(n4);
    recovered++;
  }
}
console.log("Recuperate con match parziale:", recovered);
console.log("Rimaste da aggiungere:", missing.length);
console.log("Rimaste da rimuovere:", removed.length);

// === STEP 3: Add truly missing ===
let maxCode = 0;
for (const q of kept) {
  const num = parseInt(q.code.replace(/[^0-9]/g, ""), 10);
  if (num > maxCode) maxCode = num;
}

const added = [];
let codeNum = maxCode + 1;
for (const mq of missing) {
  const topicKey = mq.topicSlug.replace(/-/g, "_");
  const code = "M" + String(codeNum).padStart(5, "0");
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

// === FINAL MERGE ===
const final = [...kept, ...added];

// === BUILD 25 CHAPTERS ===
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

// === REPORT ===
console.log("\n=== CONTEGGIO FINALE ===");
let totalFinal = 0;
for (const ch of newChapters) {
  const expected = ministryFlat.filter(q => argToChapterId[q.argSlug] === ch.id).length;
  const diff = ch.questionCount - expected;
  const status = diff === 0 ? "OK" : (diff > 0 ? "+" + diff : diff);
  console.log(
    String(ch.id).padStart(2) + ". " +
    ch.nameIT.substring(0, 55).padEnd(55) +
    String(ch.questionCount).padStart(5) + " / " +
    String(expected).padStart(5) + " " + status
  );
  totalFinal += ch.questionCount;
}

const needTranslation = final.filter(q => !q.textAR).length;
console.log("\nTotale finale:", totalFinal);
console.log("Da tradurre:", needTranslation);
console.log("Già complete:", final.length - needTranslation);

// Save
fs.writeFileSync("content/source/questions.json", JSON.stringify(final, null, 2), "utf-8");
fs.writeFileSync("content/source/chapters.json", JSON.stringify(newChapters, null, 2), "utf-8");
fs.writeFileSync("content/source/questions-removed-extras.json", JSON.stringify(removed, null, 2), "utf-8");

console.log("\n=== VERDETTO ===");
if (totalFinal >= 7100) {
  console.log("PASS - " + totalFinal + " domande, 25 argomenti ministeriali");
  if (totalFinal < 7139) {
    console.log("INFO: " + (7139 - totalFinal) + " domande con differenze testo minime non recuperate");
  }
} else {
  console.log("WARN - Solo " + totalFinal + ", servono verifiche manuali");
}

console.log("\nFile salvati:");
console.log("  questions.json (" + final.length + " domande)");
console.log("  chapters.json (25 argomenti)");
console.log("  questions-removed-extras.json (" + removed.length + " rimosse)");
