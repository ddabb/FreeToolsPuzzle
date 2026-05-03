const fs = require('fs');
const path = require('path');

const difficulties = ['easy', 'medium', 'hard'];
const sizes = { easy: 6, medium: 8, hard: 10 };
const baseDir = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

for (const diff of difficulties) {
  const dir = path.join(baseDir, diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  
  console.log(`\n=== ${diff} (size: ${sizes[diff]}) ===`);
  
  // 统计珍珠数量分布
  const pearlCounts = {};
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const pearls = data.grid.flat().filter(c => c === 1 || c === 2).length;
    pearlCounts[pearls] = (pearlCounts[pearls] || 0) + 1;
  }
  
  // 显示前5个文件
  const sampleFiles = files.slice(0, 5);
  for (const file of sampleFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const pearls = data.grid.flat().filter(c => c === 1 || c === 2).length;
    console.log(`${file}: ${pearls} pearls`);
  }
  
  console.log(`\n珍珠数量分布:`);
  const sortedCounts = Object.entries(pearlCounts).sort((a, b) => a[0] - b[0]);
  for (const [count, num] of sortedCounts) {
    console.log(`  ${count}颗: ${num}题`);
  }
}
