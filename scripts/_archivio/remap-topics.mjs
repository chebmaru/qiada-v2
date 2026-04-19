import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const qs = JSON.parse(fs.readFileSync(path.join(root, 'content/source/questions.json'), 'utf-8'));
const topics = JSON.parse(fs.readFileSync(path.join(root, 'content/source/topics.json'), 'utf-8'));
const qKeySet = new Set(qs.map(q => q.topicKey).filter(Boolean));

// ── 1. Identify duplicate topics (empty topic is variant of existing populated topic)
const duplicateOf = {
  'pannelli_posteriori_per_autoveicoli_adibiti_al_trasporto_di_cose_di_massa_a_pieno_carico': 'pannelli_posteriori_trasporto_cose',
  'sporto_cose_di_massa_a_pieno_carico': 'pannelli_posteriori_trasporto_cose',
  'in_un_incidente_chi_e_civilmente_obbligato_a_risarcire_i_danni': 'incidente_chi_civilmente_obbligato_risarcire',
  'se_si_stanno_seguendo_terapie_cure_con_farmaci_ad_azione_sedativa': 'terapie_farmaci_sedativi',
  'il_mancato_senso_del_pericolo_durante_la_guida_puo_essere_dato': 'mancato_senso_del_pericolo_durante',
  'preavviso_di_deviazione_obbligatoria_per_autocarri_in_transito': 'preavviso_deviazione_autocarri',
  'na_dipende': null, // artifact, no real topic
};

// ── 2. Text-matching patterns for each empty topic
const patterns = {
  'fermarsi_e_dare': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('segnale') && t.includes('stop') && !t.includes('preavviso')) ||
           (t.includes('fermarsi e dare') && t.includes('precedenza') && !t.includes('preavviso'));
  },
  'preavviso_di_fermarsi_e_dare': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('preavviso') && (t.includes('stop') || t.includes('fermarsi e dare'));
  },
  'con_diritto_di_precedenza_a_sinistra': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('diritto di precedenza') && t.includes('sinistra') && t.includes('intersezione');
  },
  'metri': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('distanza di sicurezza') && t.includes('70') && t.includes('metr')) ||
           (t.includes('segnale') && t.includes('70') && t.includes('metr'));
  },
  'divieto_di_transito_ai': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('divieto') && t.includes('transito') && t.includes('velociped');
  },
  'lanterna_semaforica_veicolare_normale_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('lanterna semaforica') && t.includes('veicolare') && t.includes('normale');
  },
  'quando_il_semaforo_emette_luce_verde_nella_nostra': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('semaforo') && t.includes('luce verde') && t.includes('nostra');
  },
  'possiamo_trovare_una_luce_gialla_lampeggiante': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('luce gialla lampeggiante') && !t.includes('lanterne');
  },
  'in_una_strada_a_senso_unico_con_la_striscia_bianca_discontinua': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('senso unico') && t.includes('striscia') && t.includes('discontinua');
  },
  'striscia_longitudinale_continua_e_discontinua': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('striscia') && t.includes('longitudinale') && /continua.*discontinua/.test(t);
  },
  'striscia_longitudinale_discontinua_e_continua': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('striscia') && t.includes('longitudinale') && /discontinua.*continua/.test(t);
  },
  'in_caso_di_sorpasso_di_notte_su_strada_a_doppio': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('sorpasso') && t.includes('notte') && t.includes('doppio');
  },
  'proiettore_abbagliante_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('proiettore abbagliante') && !t.includes('anabbagliante');
  },
  'proiettore_anabbagliante_asimmetrico_corretto_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('anabbagliante') && t.includes('asimmetric') && t.includes('corrett');
  },
  'proiettore_anabbagliante_asimmetrico_errato_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('anabbagliante') && t.includes('asimmetric') && t.includes('errat');
  },
  'simbolo_del_tergicristallo_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('tergicristall') && !t.includes('lava');
  },
  'lavacristallo_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('lavacristall') || (t.includes('tergi') && t.includes('lava'));
  },
  'olio_e': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('spia') && t.includes('olio')) || (t.includes('simbolo') && t.includes('olio'));
  },
  'simbolo_del_lunotto_termico': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('lunotto') && t.includes('termic');
  },
  'simbolo_di_sbrinamento_del_parabrezza': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('sbrinamento') && t.includes('parabrezza');
  },
  'spostamento_del_carico_in_avanti_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('spostamento') && t.includes('carico') && t.includes('avanti');
  },
  'pannelli_arancioni_per_trasporto_merci_pericolose': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('pannell') && t.includes('arancio') && t.includes('pericolos');
  },
  'cause_principali_di_incidenti_possono': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('cause') && t.includes('principal') && t.includes('incident');
  },
  'coperta_di_neve_o_ghiaccio': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('coperta') && t.includes('neve')) ||
           (t.includes('strada') && t.includes('neve') && t.includes('ghiaccio') && q.chapterId === 25);
  },
  'uscita_delle_gallerie_e': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('uscita') && t.includes('galleri')) || (t.includes('ingresso') && t.includes('galleri'));
  },
  'si_sbaglia_corsia': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('sbaglia') && t.includes('corsia');
  },
  'responsabilita_civile_auto_i': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('r.c.a') || t.includes('rca') || (t.includes('assicurazione') && t.includes('civile') && t.includes('auto'));
  },
  'influenza_di_sostanze_stupefacenti_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('sostanz') && t.includes('stupefacent');
  },
  'inquinamento_atmosferico_prodotto_dai_veicoli_con_motore_diesel': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('diesel') && t.includes('inquin')) || (t.includes('inquin') && t.includes('diesel'));
  },
  'sono_causa_di': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('sono causa di') && q.chapterId === 28;
  },
  'cono': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('cono') && t.includes('segnalazione')) || (t.includes('cono') && t.includes('traffico'));
  },
  'delineatori_normali_di_margine_per_strade_a_senso_unico': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('delineator') && t.includes('margine') && t.includes('senso unico');
  },
  'delineatori_per_gallerie_a_senso_unico': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('delineator') && t.includes('galleri') && t.includes('senso unico');
  },
  'delineatore_per': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('delineatore') && t.includes('intersezione a t');
  },
  'preavviso_di_deviazione_alternativo': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('preavviso') && t.includes('deviazione') && t.includes('alternativ');
  },
  'segnale_di_preavviso_di_intersezioni_ravvicinate_urbane': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('intersezioni ravvicinate');
  },
  'intersezione_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('intersezione') && t.includes('limitazione') && t.includes('transito');
  },
  'aderenza_contatto_delle_ruote_sul_manto_stradale_e_ridotta': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('aderenza') && t.includes('ridotta')) || (t.includes('contatto') && t.includes('ruote') && t.includes('ridott'));
  },
  'sulla_stabilita_del_veicolo_in_marcia_influisce': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('stabilit') && t.includes('veicolo') && t.includes('influisc');
  },
  'se_il_veicolo_in_fase_di_frenatura_tende_a_sbandare': q => {
    const t = q.textIT.toLowerCase();
    return (t.includes('frenatura') && t.includes('sbandare')) || (t.includes('sbandare') && t.includes('frenatura'));
  },
  'per_controllare_lo_sbandamento_del_veicolo_e': q => {
    const t = q.textIT.toLowerCase();
    return t.includes('controllare') && t.includes('sbandamento');
  },
};

// ── 3. Run matching
console.log('=== TOPIC REMAPPING ANALYSIS ===\n');

const remapping = {}; // topicKey -> [questionCodes]
let totalRemapped = 0;
let duplicateCount = 0;

// Handle duplicates first
for (const [empty, existing] of Object.entries(duplicateOf)) {
  if (existing === null) {
    console.log(`ARTIFACT: ${empty} → remove (not a real topic)`);
    duplicateCount++;
    continue;
  }
  const count = qs.filter(q => q.topicKey === existing).length;
  console.log(`DUPLICATE: ${empty} → merge into ${existing} (${count} questions)`);
  remapping[empty] = { type: 'duplicate', mergeInto: existing, codes: qs.filter(q => q.topicKey === existing).map(q => q.code) };
  duplicateCount++;
}

console.log('');

// Handle text-matched topics
let textMatched = 0;
let zeroMatch = 0;
for (const [key, matcher] of Object.entries(patterns)) {
  const matched = qs.filter(matcher);
  if (matched.length > 0) {
    console.log(`MATCH: ${key} → ${matched.length} questions`);
    matched.slice(0, 2).forEach(q => console.log(`  ${q.code} [was: ${q.topicKey}] ${q.textIT.substring(0, 80)}`));
    remapping[key] = { type: 'text_match', codes: matched.map(q => q.code) };
    textMatched += matched.length;
  } else {
    console.log(`ZERO: ${key} → 0 (topic exists for educational content only)`);
    zeroMatch++;
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Duplicates to merge: ${duplicateCount}`);
console.log(`Text-matched questions: ${textMatched}`);
console.log(`Topics with 0 questions (educational only): ${zeroMatch}`);
console.log(`Total topics to fix: ${Object.keys(remapping).length}`);

// ── 4. Generate SQL
const sqlLines = [];
sqlLines.push('-- Remap questions to correct topics (add M2M entries)');
sqlLines.push('-- Generated by remap-topics.mjs\n');

for (const [topicKey, info] of Object.entries(remapping)) {
  if (info.type === 'duplicate') {
    // For duplicates: add the questions from the existing topic to also link to the empty topic
    sqlLines.push(`-- DUPLICATE: ${topicKey} gets same questions as ${info.mergeInto}`);
    sqlLines.push(`INSERT INTO question_topics (question_id, topic_id)`);
    sqlLines.push(`SELECT qt.question_id, t_new.id`);
    sqlLines.push(`FROM question_topics qt`);
    sqlLines.push(`JOIN topics t_old ON t_old.id = qt.topic_id AND t_old.topic_key = '${info.mergeInto}'`);
    sqlLines.push(`CROSS JOIN topics t_new`);
    sqlLines.push(`WHERE t_new.topic_key = '${topicKey}'`);
    sqlLines.push(`ON CONFLICT DO NOTHING;\n`);
  } else {
    // For text-matched: add the matched questions to this topic
    sqlLines.push(`-- TEXT MATCH: ${topicKey} (${info.codes.length} questions)`);
    sqlLines.push(`INSERT INTO question_topics (question_id, topic_id)`);
    sqlLines.push(`SELECT q.id, t.id`);
    sqlLines.push(`FROM questions q`);
    sqlLines.push(`CROSS JOIN topics t`);
    sqlLines.push(`WHERE t.topic_key = '${topicKey}'`);
    sqlLines.push(`AND q.code IN (${info.codes.map(c => `'${c}'`).join(', ')})`);
    sqlLines.push(`ON CONFLICT DO NOTHING;\n`);
  }
}

fs.writeFileSync(path.join(root, 'scripts/remap-topics.sql'), sqlLines.join('\n'), 'utf-8');
console.log('\nSQL written to scripts/remap-topics.sql');

// ── 5. Also output educational-only topics (keep but show 0 is expected)
const educationalOnly = [];
for (const [key] of Object.entries(patterns)) {
  if (!remapping[key]) educationalOnly.push(key);
}
console.log(`\nEducational-only topics (0 questions is correct): ${educationalOnly.length}`);
educationalOnly.forEach(k => console.log(`  ${k}`));
