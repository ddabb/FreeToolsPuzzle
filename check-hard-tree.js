const fs = require('fs');
const path = require('path');

const DATA_DIR = 'f:/SelfJob/freetoolspuzzle/data/tents/hard';
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).sort();

console.log('检查前5个hard题目的treeCount:\n');

for (let i = 0; i < 5; i++) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, files[i]), 'utf-8'));
  console.log(`${files[i]}: treeCount=${data.treeCount}, grid中的树=${data.grid.flat().filter(c => c === 1).length}`);
}

console.log('\n检查hard难度配置的treeCount范围:');
const treeCounts = [];
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
  treeCounts.push(data.treeCount);
}

const min = Math.min(...treeCounts);
const max = Math.max(...treeCounts);
console.log(`hard难度实际treeCount范围: ${min} - ${max}`);