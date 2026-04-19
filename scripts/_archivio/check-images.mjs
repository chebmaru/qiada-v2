import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const l = JSON.parse(readFileSync(join(root, 'content/source/lessons.json'), 'utf-8'));
const q = JSON.parse(readFileSync(join(root, 'content/source/questions.json'), 'utf-8'));
const signsFiles = new Set(readdirSync(join(root, 'content/signs')));
const argFiles = new Set(readdirSync(join(root, 'content/argomenti')));

// 1. Quiz images
console.log('📷 IMMAGINI QUIZ');
const withImg = q.filter(x => x.imageUrl && x.imageUrl.trim());
const uniqueImgs = [...new Set(withImg.map(x => x.imageUrl))];
let qMissing = 0;
for (const img of uniqueImgs) {
  const fn = img.split('/').pop();
  if (!signsFiles.has(fn)) {
    qMissing++;
    console.log('  ❌ ' + fn);
  }
}
if (qMissing === 0) console.log('  ✅ Tutte le ' + uniqueImgs.length + ' foto quiz esistono');

// 2. Topic images
console.log('\n📖 IMMAGINI ARGOMENTI');
let tMissing = [];
for (const lesson of l) {
  for (const topic of (lesson.topics || [])) {
    if (topic.imageUrl && topic.imageUrl.trim()) {
      const fn = topic.imageUrl.split('/').pop();
      if (!signsFiles.has(fn) && !argFiles.has(fn)) {
        tMissing.push({ topic: topic.topicKey, file: fn, url: topic.imageUrl });
      }
    }
  }
}
if (tMissing.length === 0) {
  console.log('  ✅ Tutte le immagini argomenti esistono');
} else {
  console.log('  ❌ Mancanti: ' + tMissing.length);
  const byDir = {};
  for (const m of tMissing) {
    const dir = m.url.split('/').slice(0, -1).join('/');
    if (!byDir[dir]) byDir[dir] = [];
    byDir[dir].push(m);
  }
  for (const [dir, items] of Object.entries(byDir)) {
    console.log('  ' + dir + ': ' + items.length + ' file');
    items.slice(0, 5).forEach(m => console.log('    ' + m.file + ' ← ' + m.topic));
    if (items.length > 5) console.log('    ...e altri ' + (items.length - 5));
  }
}

// 3. File non referenziati
console.log('\n🗑️ FILE NON USATI');
const allReferenced = new Set();
for (const img of uniqueImgs) allReferenced.add(img.split('/').pop());
for (const lesson of l) {
  for (const topic of (lesson.topics || [])) {
    if (topic.imageUrl) allReferenced.add(topic.imageUrl.split('/').pop());
  }
}
const unusedSigns = [...signsFiles].filter(f => !allReferenced.has(f) && (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.svg')));
const unusedArgs = [...argFiles].filter(f => !allReferenced.has(f) && (f.endsWith('.png') || f.endsWith('.jpg')));
console.log('  Signs non usati:', unusedSigns.length);
console.log('  Argomenti non usati:', unusedArgs.length);
