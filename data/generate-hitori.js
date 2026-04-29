/**
 * 数壹游戏批量生成 - 每个题目单独文件
 */

const fs = require('fs');
const path = require('path');

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateHitori(size, seed) {
  const rand = seededRand(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  
  // 生成随机数字
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r][c] = Math.floor(rand() * size) + 1; // 1到size的数字
    }
  }
  
  return {
    size,
    grid,
    seed
  };
}

function main() {
  const outputDir = path.join(__dirname, 'hitori');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', size: 5 },
    { name: 'medium', size: 8 },
    { name: 'hard', size: 12 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  
  for (const { name, size } of difficulties) {
    console.log(`生成 ${name} (${size}×${size})...`);
    
    for (let i = 1; i <= countPerDiff; i++) {
      const seed = i * 99991 + size * 7777;
      const game = generateHitori(size, seed);
      
      const item = {
        id: i,
        difficulty: name,
        size: game.size,
        grid: game.grid,
        seed
      };
      
      // 每个题目单独一个文件
      const filename = `${name}-${String(i).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(item));
      
      total++;
      process.stdout.write(`  ✓ ${filename}\r`);
    }
    console.log(`  ✓ ${name} 完成`);
  }

  // 保存索引
  const index = {
    total,
    difficulties: difficulties.map(d => d.name),
    generatedAt: new Date().toISOString(),
    files: fs.readdirSync(outputDir).filter(f => f.endsWith('.json') && f !== 'index.json').sort()
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));

  console.log(`\n完成! 总计 ${total} 个题目, 耗时 ${Math.round((Date.now() - startTime) / 1000)}秒`);
}

main();