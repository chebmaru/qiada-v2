import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const q = JSON.parse(readFileSync(join(root, 'content/source/questions.json'), 'utf-8'));

const codes = q.map(x => x.code);
const bCodes = codes.filter(c => c.startsWith('B'));
const qbCodes = codes.filter(c => c.startsWith('QB'));
const aaCodes = codes.filter(c => c.startsWith('AA'));
const other = codes.filter(c => {
  return !c.startsWith('B') && !c.startsWith('QB') && !c.startsWith('AA');
});

console.log('CODICI MINISTERIALI:');
console.log('  B*:  ' + bCodes.length);
console.log('  QB*: ' + qbCodes.length);
console.log('  AA*: ' + aaCodes.length);
console.log('  Altri: ' + other.length);
if (other.length > 0) console.log('    ' + other.slice(0, 5).join(', '));
console.log('  Totale: ' + codes.length);

// Immagini
const withImg = q.filter(x => x.imageUrl);
console.log('\nIMMAGINI: ' + withImg.length + ' domande con foto');

// Tipo di naming delle immagini
const imgNames = withImg.map(x => x.imageUrl.split('/').pop());
const byPrefix = {};
for (const name of imgNames) {
  const prefix = name.replace(/[0-9_]+\..+$/, '');
  byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
}
console.log('\nNaming immagini:');
Object.entries(byPrefix).sort((a,b) => b[1] - a[1]).forEach(([p, n]) => {
  console.log('  ' + p + '*: ' + n + ' file');
});

// Campione
console.log('\nCampione 10 immagini:');
withImg.slice(0, 10).forEach(x => {
  console.log('  [' + x.code + '] topic=' + x.topicKey + ' → ' + x.imageUrl);
});

// Relazione codice-immagine
console.log('\nIl nome file contiene il codice domanda?');
let codeInName = 0;
for (const x of withImg) {
  const fn = x.imageUrl.split('/').pop().replace(/\.[^.]+$/, '');
  if (fn.includes(x.code)) codeInName++;
}
console.log('  ' + codeInName + '/' + withImg.length + ' immagini contengono il codice domanda nel nome');
