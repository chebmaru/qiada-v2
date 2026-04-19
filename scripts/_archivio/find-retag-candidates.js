const fs = require("fs");
const qs = JSON.parse(fs.readFileSync("content/source/questions.json", "utf-8"));

function find(label, capId, filterFn) {
  const matches = qs.filter(filterFn);
  console.log(`\n=== Cap ${capId}: ${label} ===`);
  console.log(`Trovate: ${matches.length}`);
  const byCap = {};
  matches.forEach(q => { byCap[q.chapterId] = (byCap[q.chapterId] || 0) + 1; });
  console.log("Attualmente in:", JSON.stringify(byCap));
  matches.slice(0, 5).forEach(q =>
    console.log(`  [Cap${q.chapterId}|${q.topicKey}] ${q.textIT.substring(0, 90)}`)
  );
  return matches;
}

// CAP 7: Segnali Temporanei e di Cantiere
const cap7 = find("Segnali Temporanei/Cantiere", 7, q => {
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
});

// CAP 17: Ingombro della Carreggiata e Segnalazione
const cap17 = find("Ingombro Carreggiata", 17, q => {
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
});

// CAP 22: Trasporto Persone, Carico e Traino
const cap22 = find("Trasporto/Carico/Traino", 22, q => {
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
    (t.includes("trainare") || t.includes("veicolo trainato"))
  );
});

// CAP 24: Obblighi verso Agenti e Documenti
const cap24 = find("Obblighi Agenti/Documenti", 24, q => {
  const t = q.textIT.toLowerCase();
  const tk = (q.topicKey || "").toLowerCase();
  return (
    tk.includes("documenti_circolazione") ||
    tk.includes("obblighi_agenti") ||
    tk.includes("revisione_veicolo") ||
    tk.includes("carta_circolazione") ||
    (t.includes("carta di circolazione") && !t.includes("segnale")) ||
    (t.includes("revisione") && t.includes("veicol")) ||
    t.includes("certificato di propriet") ||
    (t.includes("esibire") && t.includes("agent")) ||
    (t.includes("obbligo") && t.includes("agent") && !t.includes("segnale") && !t.includes("semaforo"))
  );
});

// CAP 30: Stabilità e Tenuta di Strada
const cap30 = find("Stabilità/Tenuta Strada", 30, q => {
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
});

console.log("\n\n=== RIEPILOGO ===");
console.log(`Cap 7  (Cantiere):   ${cap7.length} da ri-taggare`);
console.log(`Cap 17 (Ingombro):   ${cap17.length} da ri-taggare`);
console.log(`Cap 22 (Trasporto):  ${cap22.length} da ri-taggare`);
console.log(`Cap 24 (Obblighi):   ${cap24.length} da ri-taggare`);
console.log(`Cap 30 (Stabilità):  ${cap30.length} da ri-taggare`);
console.log(`Totale: ${cap7.length + cap17.length + cap22.length + cap24.length + cap30.length}`);

// Check overlaps
const allCodes = new Set();
const overlaps = [];
for (const arr of [cap7, cap17, cap22, cap24, cap30]) {
  for (const q of arr) {
    if (allCodes.has(q.code)) overlaps.push(q.code);
    allCodes.add(q.code);
  }
}
console.log(`\nSovrapposizioni: ${overlaps.length}`);
if (overlaps.length > 0) {
  console.log("Codici sovrapposti:", overlaps.slice(0, 10).join(", "));
}
