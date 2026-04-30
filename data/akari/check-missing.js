const fs = require('fs');
const dir = 'F:/SelfJob/FreeToolsPuzzle/data/akari/hard';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const ids = new Set(files.map(f => parseInt(f.match(/hard-(\d+)/)[1])));
const missing = [];
for (let i = 1; i <= 1000; i++) {
  if (!ids.has(i)) missing.push(i);
}
console.log('缺失ID:', missing);
console.log('总数:', files.length);
