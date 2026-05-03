// 检查现有 Masyu 题库的唯一解比例
const fs = require('fs');
const path = require('path');
const { countSolutions } = require('./data/validators/masyu');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

console.log('检查 Masyu 题库唯一解比例...\n');

for (const diff of DIFFICULTIES) {
  const dir = path.join(__dirname, 'data', 'masyu', diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(0, 10);
  
  let unique = 0, multiple = 0;
  const startTime = Date.now();
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const count = countSolutions(data.grid, data.size, 3);
    if (count === 1) unique++;
    else multiple++;
    console.log(`  ${file}: ${count}解`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`${diff}: 唯一解=${unique}, 多解=${multiple} (${files.length}题, ${elapsed}s)\n`);
}
