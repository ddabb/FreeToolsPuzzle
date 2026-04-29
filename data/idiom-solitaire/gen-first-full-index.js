const path = require('path');
const fs = require('fs');
const { pinyin } = require('pinyin-pro');

const idioms = require('./idiom.json');

const firstFullIndex = {};
for (const item of idioms) {
  const fp = pinyin(item.word[0], { toneType: 'none' }).toLowerCase().trim();
  if (!firstFullIndex[fp]) firstFullIndex[fp] = [];
  firstFullIndex[fp].push(item.word);
}
for (const k of Object.keys(firstFullIndex)) firstFullIndex[k].sort();

const keys = Object.keys(firstFullIndex).slice(0, 10);
console.debug('sample keys:', keys);
console.debug('wei:', (firstFullIndex['wei'] || []).slice(0, 5));
console.debug('total keys:', Object.keys(firstFullIndex).length);

const outPath = path.join(__dirname, 'idiom-first-full-index.json');
fs.writeFileSync(outPath, JSON.stringify(firstFullIndex), 'utf8');
const size = (fs.statSync(outPath).size / 1024).toFixed(0);
console.debug('done:', outPath, size + 'KB');
