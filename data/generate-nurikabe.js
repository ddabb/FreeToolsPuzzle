/**
 * 数墙游戏批量生成 - 每个题目单独文件
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

/**
 * 验证数墙游戏题目是否有效
 * @param {Object} puzzle 数墙游戏题目对象
 * @returns {boolean} 是否有效
 */
function validateNurikabe(puzzle) {
  // 验证数据结构
  if (!puzzle.grid || 
      puzzle.grid.length !== puzzle.size || 
      puzzle.grid[0].length !== puzzle.size) {
    return false;
  }

  // 验证数字的有效性（非负整数）
  for (let i = 0; i < puzzle.size; i++) {
    for (let j = 0; j < puzzle.size; j++) {
      const cell = puzzle.grid[i][j];
      if (typeof cell !== 'number' || cell < 0) {
        return false;
      }
    }
  }

  // 验证是否有唯一解（简化版验证）
  // 检查数字是否可能形成有效的白色区域
  const size = puzzle.size;
  
  // 检查数字是否过多（可能无法形成有效的白色区域）
  let numberCount = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (puzzle.grid[i][j] > 0) {
        numberCount++;
      }
    }
  }
  
  // 计算最大可能的白色区域数
  const maxWhiteAreas = Math.floor((size * size) / 2);
  if (numberCount > maxWhiteAreas) {
    return false;
  }

  return true;
}

function generateNurikabe(size, seed) {
  const rand = seededRand(seed);
  let grid;
  let attempts = 0;
  const maxAttempts = 100;
  
  // 生成有效的数墙题目
  do {
    grid = Array.from({ length: size }, () => Array(size).fill(0));
    
    // 生成随机数字
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (rand() < 0.3) { // 30% 的概率生成数字
          grid[r][c] = Math.floor(rand() * 5) + 1; // 1-5的数字
        }
      }
    }
    
    attempts++;
  } while (!validateNurikabe({ size, grid }) && attempts < maxAttempts);
  
  return {
    size,
    grid,
    seed
  };
}

function main() {
  const outputDir = path.join(__dirname, 'nurikabe');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', size: 5 },
    { name: 'medium', size: 10 },
    { name: 'hard', size: 15 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  
  for (const { name, size } of difficulties) {
    console.log(`生成 ${name} (${size}×${size})...`);
    
    for (let i = 1; i <= countPerDiff; i++) {
      const seed = i * 99991 + size * 7777;
      const game = generateNurikabe(size, seed);
      
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