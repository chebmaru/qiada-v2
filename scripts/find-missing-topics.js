const topics = require('../content/source/topics.json');

const missingTitleAR = topics.filter(t => !t.titleAR);
const missingContentIT = topics.filter(t => !t.contentIT);
const missingContentAR = topics.filter(t => !t.contentAR);
const anyMissing = topics.filter(t => !t.titleAR || !t.contentIT || !t.contentAR);

console.log('Total topics:', topics.length);
console.log('Missing titleAR:', missingTitleAR.length);
console.log('Missing contentIT:', missingContentIT.length);
console.log('Missing contentAR:', missingContentAR.length);
console.log('Any field missing:', anyMissing.length);
console.log('With questions:', anyMissing.filter(t => t.questionCount > 0).length);
console.log('Without questions:', anyMissing.filter(t => !t.questionCount || t.questionCount === 0).length);
console.log('---');

// Export for translation script
const forTranslation = anyMissing.map(t => ({
  topicKey: t.topicKey,
  titleIT: t.titleIT || '',
  titleAR: t.titleAR || '',
  contentIT: t.contentIT || '',
  contentAR: t.contentAR || '',
  chapterId: t.chapterId,
  questionCount: t.questionCount || 0,
  needs: [
    !t.titleAR ? 'titleAR' : null,
    !t.contentIT ? 'contentIT' : null,
    !t.contentAR ? 'contentAR' : null,
  ].filter(Boolean)
}));

console.log('\nSample 5:');
forTranslation.slice(0, 5).forEach(t => console.log(JSON.stringify(t)));

const fs = require('fs');
fs.writeFileSync(
  __dirname + '/output/topics-missing-translations.json',
  JSON.stringify(forTranslation, null, 2),
  'utf8'
);
console.log('\nSaved to scripts/output/topics-missing-translations.json');
