const fs = require('fs');
const path = require('path');

// ============================================================
// RENAME SIGNS: qb_XX.png → topicKey_qb_XX.png
// Also updates ALL content JSON files that reference /signs/qb_
// ============================================================

const ROOT = path.join(__dirname, '..');
const SIGNS_DIR = path.join(ROOT, 'frontend/public/signs');
const BACKUP_JSON = path.join(ROOT, 'content/source/questions-pre-retag-backup.json');

// --- Step 1: Build rename map from questions ---
const qs = JSON.parse(fs.readFileSync(BACKUP_JSON, 'utf-8'));
const map = {}; // old filename → new filename
for (const q of qs) {
  if (q.imageUrl && q.imageUrl.startsWith('/signs/qb_')) {
    const file = q.imageUrl.replace('/signs/', '');
    if (!map[file]) {
      const topic = q.topicKey || 'unknown';
      const num = file.match(/\d+/)[0];
      const ext = path.extname(file);
      map[file] = `${topic}_qb_${num}${ext}`;
    }
  }
}

const entries = Object.entries(map).sort((a, b) => {
  return parseInt(a[0].match(/\d+/)[0]) - parseInt(b[0].match(/\d+/)[0]);
});

console.log(`\n=== RENAME PLAN: ${entries.length} files ===\n`);

// --- Step 2: Dry run check ---
const MODE = process.argv[2]; // --dry or --run
if (!MODE || (MODE !== '--dry' && MODE !== '--run')) {
  console.log('Usage: node rename-signs.js --dry   (preview)');
  console.log('       node rename-signs.js --run   (execute)');
  process.exit(0);
}

// --- Step 3: Rename physical files ---
let renamed = 0;
let missing = 0;
let errors = [];

for (const [oldName, newName] of entries) {
  const oldPath = path.join(SIGNS_DIR, oldName);
  const newPath = path.join(SIGNS_DIR, newName);

  if (!fs.existsSync(oldPath)) {
    missing++;
    continue;
  }

  if (MODE === '--dry') {
    console.log(`  ${oldName} → ${newName}`);
  } else {
    try {
      fs.renameSync(oldPath, newPath);
      renamed++;
    } catch (e) {
      errors.push(`${oldName}: ${e.message}`);
    }
  }
}

if (MODE === '--dry') {
  console.log(`\nWould rename: ${entries.length - missing} files (${missing} not found on disk)`);
  console.log('\nRun with --run to execute.\n');
  process.exit(0);
}

console.log(`\nFiles renamed: ${renamed}`);
if (missing > 0) console.log(`Files not found: ${missing}`);
if (errors.length > 0) {
  console.log(`Errors: ${errors.length}`);
  errors.forEach(e => console.log(`  ERROR: ${e}`));
}

// --- Step 4: Update all content JSON files ---
const JSON_FILES = [
  'content/source/questions.json',
  'content/source/questions-retagged.json',
  'content/source/questions-pre-retag-backup.json',
  'content/source/topics.json',
  'content/enriched/confusing-pairs.json',
  'content/enriched/signs-descriptions.json',
  'content/archive/vf-per-argomento.json',
  'content/archive/vf-per-segnale.json',
  'content/archive/deepseek-corrections-log.json',
  'content/archive/all-anomalies-from-batches.json',
  'content/archive/content-v2-dataset.json',
  'content/lessons-original-with-topics.json',
  'scripts/output/example-topic-complete.json',
  'scripts/output/topics_check.json',
];

console.log(`\n=== UPDATING JSON REFERENCES ===\n`);

let totalReplacements = 0;

for (const rel of JSON_FILES) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${rel}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  let fileReplacements = 0;

  for (const [oldName, newName] of entries) {
    const oldRef = `/signs/${oldName}`;
    const newRef = `/signs/${newName}`;
    // Count occurrences
    const count = (content.split(oldRef).length - 1);
    if (count > 0) {
      content = content.split(oldRef).join(newRef);
      fileReplacements += count;
    }
  }

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ ${rel}: ${fileReplacements} refs updated`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`  - ${rel}: no refs found`);
  }
}

// --- Step 5: Validation ---
console.log(`\n=== VALIDATION ===\n`);

// Sample 3 random renamed files
const signFiles = fs.readdirSync(SIGNS_DIR).filter(f => f.endsWith('.png'));
const renamedFiles = signFiles.filter(f => !f.startsWith('qb_'));
const sample = [];
for (let i = 0; i < 3 && renamedFiles.length > 0; i++) {
  const idx = Math.floor(Math.random() * renamedFiles.length);
  sample.push(renamedFiles.splice(idx, 1)[0]);
}
console.log('Sample renamed files:');
sample.forEach(f => console.log(`  ${f}`));

// Check no orphan qb_ files remain
const remainingQb = signFiles.filter(f => f.startsWith('qb_'));
console.log(`\nRemaining qb_ files: ${remainingQb.length}`);
if (remainingQb.length > 0 && remainingQb.length <= 10) {
  remainingQb.forEach(f => console.log(`  ${f}`));
}

// Verify a JSON file has new references
const verifyFile = path.join(ROOT, 'content/source/questions.json');
if (fs.existsSync(verifyFile)) {
  const verifyContent = fs.readFileSync(verifyFile, 'utf-8');
  const oldRefs = (verifyContent.match(/\/signs\/qb_\d+\.png/g) || []).length;
  const newRefs = (verifyContent.match(/\/signs\/[a-z_]+_qb_\d+\.png/g) || []).length;
  console.log(`\nquestions.json: ${oldRefs} old refs, ${newRefs} new refs`);
}

// --- Verdict ---
const pass = renamed > 0 && errors.length === 0 && totalReplacements > 0;
console.log(`\n=== VERDICT: ${pass ? 'PASS ✓' : 'FAIL ✗'} ===`);
console.log(`Files renamed: ${renamed}`);
console.log(`JSON refs updated: ${totalReplacements}`);
console.log(`Errors: ${errors.length}`);
