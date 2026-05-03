const fs = require('fs');
const path = require('path');

const difficulties = ['easy', 'medium', 'hard'];
const sizes = { easy: 5, medium: 5, hard: 5 }; // 先看看实际尺寸
const baseDir = 'F:/SelfJob/FreeToolsPuzzle/data/slither-link';

for (const diff of difficulties) {
  const dir = path.join(baseDir, diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  
  console.log(`\n=== ${diff} ===`);
  
  // 显示前3个文件
  const sampleFiles = files.slice(0, 3);
  for (const file of sampleFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const size = data.size;
    const totalCells = size * size;
    const clues = data.grid.flat().filter(c => c >= 0 && c <= 3).length;
    const density = (clues / totalCells * 100).toFixed(1);
    console.log(`${file}: ${size}x${size}, ${clues} clues, ${density}% density`);
  }
}
