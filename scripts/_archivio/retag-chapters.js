const fs = require("fs");
const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));

// Backup
fs.writeFileSync("content/source/questions-pre-retag-chapters.json", JSON.stringify(qs, null, 2), "utf-8");
console.log("Backup salvato: questions-pre-retag-chapters.json");

// Mapping functions - order matters for overlap resolution (most specific first)
const rules = [
  {
    capId: 7,
    name: "Segnali Temporanei/Cantiere",
    match: q => {
      const t = q.textIT.toLowerCase();
      const tk = (q.topicKey || "").toLowerCase();
      return (
        tk.includes("cantiere") ||
        tk.includes("lavori_in_corso") ||
        tk.includes("segnale_temporaneo") ||
        tk.includes("deviazione_provvisoria") ||
        (t.includes("cantiere") && !t.includes("salvagente") && !t.includes("sentiero fangoso")) ||
        (t.includes("lavori in corso") && (t.includes("segnale") || t.includes("pannello") || t.includes("barriera"))) ||
        t.includes("segnale mobile di pericolo") ||
        t.includes("deviazione provvisoria")
      );
    }
  },
  {
    capId: 17,
    name: "Ingombro Carreggiata",
    match: q => {
      const t = q.textIT.toLowerCase();
      const tk = (q.topicKey || "").toLowerCase();
      return (
        tk.includes("ingombro") ||
        tk.includes("segnalazione_pericolo") ||
        (t.includes("ingombro") && t.includes("carreggiata")) ||
        (t.includes("triangolo") && t.includes("segnalazione")) ||
        t.includes("dispositivo supplementare di segnalazione") ||
        t.includes("giubbotto retroriflettente") ||
        t.includes("giubbotto ad alta visibilit")
      );
    }
  },
  {
    capId: 24,
    name: "Obblighi Agenti/Documenti",
    match: q => {
      const t = q.textIT.toLowerCase();
      const tk = (q.topicKey || "").toLowerCase();
      return (
        tk.includes("documenti_circolazione") ||
        tk.includes("obblighi_agenti") ||
        tk.includes("revisione_veicolo") ||
        tk.includes("carta_circolazione") ||
        tk.includes("documenti_da_esibire") ||
        (t.includes("carta di circolazione") && !t.includes("segnale")) ||
        (t.includes("revisione") && t.includes("veicol")) ||
        t.includes("certificato di propriet") ||
        (t.includes("esibire") && t.includes("agent")) ||
        (t.includes("obbligo") && t.includes("agent") && !t.includes("segnale") && !t.includes("semaforo"))
      );
    }
  },
  {
    capId: 22,
    name: "Trasporto/Carico/Traino",
    match: q => {
      const t = q.textIT.toLowerCase();
      const tk = (q.topicKey || "").toLowerCase();
      return (
        tk.includes("trasporto_persone") ||
        tk.includes("traino") ||
        tk.includes("rimorchio") ||
        tk.includes("carico_veicolo") ||
        tk.includes("massa_rimorchiabile") ||
        (t.includes("trasporto di persone") && !t.includes("macchine agricole")) ||
        (t.includes("carico") && (t.includes("sporgere") || t.includes("sporgenza"))) ||
        (t.includes("rimorchio") && (t.includes("traino") || t.includes("massa") || t.includes("agganciare") || t.includes("freno"))) ||
        t.includes("trainare") ||
        t.includes("veicolo trainato")
      );
    }
  },
  {
    capId: 30,
    name: "Stabilità/Tenuta Strada",
    match: q => {
      const t = q.textIT.toLowerCase();
      const tk = (q.topicKey || "").toLowerCase();
      return (
        tk.includes("aquaplaning") ||
        tk.includes("aderenza") ||
        tk.includes("stabilita") ||
        tk.includes("tenuta_strada") ||
        tk.includes("slittamento") ||
        t.includes("aquaplaning") ||
        (t.includes("aderenza") && (t.includes("pneumatic") || t.includes("fondo") || t.includes("veicolo"))) ||
        t.includes("sovrasterzo") ||
        t.includes("sottosterzo") ||
        (t.includes("slittamento") && !t.includes("segnale")) ||
        t.includes("tenuta di strada") ||
        (t.includes("pneumatici") && (t.includes("pressione") || t.includes("usura") || t.includes("consumo") || t.includes("tipo")))
      );
    }
  }
];

// Apply retag - first match wins (most specific rules first)
const changes = [];
const retagged = new Set();

for (const rule of rules) {
  for (const q of qs) {
    if (retagged.has(q.code)) continue; // Already assigned to a more specific chapter
    if (q.chapterId === rule.capId) continue; // Already in correct chapter
    if (rule.match(q)) {
      changes.push({
        code: q.code,
        from: q.chapterId,
        to: rule.capId,
        text: q.textIT.substring(0, 80)
      });
      q.chapterId = rule.capId;
      retagged.add(q.code);
    }
  }
}

// Save
fs.writeFileSync("content/source/questions.json", JSON.stringify(qs, null, 2), "utf-8");

// Report
console.log(`\nRi-taggati: ${changes.length} domande`);
const byCap = {};
for (const c of changes) {
  byCap[c.to] = (byCap[c.to] || 0) + 1;
}
for (const rule of rules) {
  console.log(`  Cap ${rule.capId} (${rule.name}): ${byCap[rule.capId] || 0}`);
}

// Verify: no more empty chapters
console.log("\n=== VERIFICA POST-RETAG ===");
const chapters = JSON.parse(fs.readFileSync("content/source/chapters.json", "utf-8"));
let allGood = true;
for (const c of chapters) {
  const count = qs.filter(q => q.chapterId === c.id).length;
  if (count === 0) {
    console.log(`ERRORE: Cap ${c.id} (${c.nameIT}) ancora vuoto`);
    allGood = false;
  } else if (count < 10) {
    console.log(`ATTENZIONE: Cap ${c.id} (${c.nameIT}): solo ${count} domande`);
  }
}

if (allGood) {
  console.log("PASS - Tutti i capitoli hanno domande");
} else {
  console.log("FAIL - Ci sono ancora capitoli vuoti");
}

// Sample 3 random changes
console.log("\n=== CAMPIONE (3 random) ===");
const sample = changes.sort(() => Math.random() - 0.5).slice(0, 3);
for (const s of sample) {
  console.log(`  ${s.code}: Cap ${s.from} → Cap ${s.to}`);
  console.log(`    "${s.text}"`);
}

// Final count per chapter
console.log("\n=== CONTEGGIO FINALE ===");
for (const c of chapters) {
  const count = qs.filter(q => q.chapterId === c.id).length;
  console.log(`Cap ${c.id} (${c.nameIT.substring(0, 40)}): ${count}`);
}
