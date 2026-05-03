const fs = require('fs');
const path = require('path');

const difficulties = ['easy', 'medium', 'hard'];
const sizes = { easy: 6, medium: 8, hard: 10 };
const totalCells = { easy: 36, medium: 64, hard: 100 };
const baseDir = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

console.log('检查回路覆盖率（回路经过的格子数 / 总格数）\n');

for (const diff of difficulties) {
  const dir = path.join(baseDir, diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  // 统计回路长度分布
  const coverages = [];

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    // 计算有连线的格子数
    let connectedCells = 0;
    for (let r = 0; r < data.size; r++) {
      for (let c = 0; c < data.size; c++) {
        const cell = data.lines[r][c];
        if (cell.top || cell.right || cell.bottom || cell.left) {
          connectedCells++;
        }
      }
    }
    coverages.push((connectedCells / totalCells[diff] * 100).toFixed(1));
  }

  const avg = (coverages.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / coverages.length).toFixed(1);
  const min = Math.min(...coverages);
  const max = Math.max(...coverages);

  console.log(`${diff}: 平均覆盖率 ${avg}%, 范围 ${min}%-${max}%`);

  // 显示前5个文件
  console.log('前5个文件:');
  for (let i = 0; i < 5; i++) {
    console.log(`  ${files[i]}: ${coverages[i]}% 覆盖`);
  }
  console.log();
}
