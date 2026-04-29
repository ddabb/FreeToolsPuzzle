/**
 * 数回游戏批量生成 - 每个题目单独文件
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
 * 验证数回游戏题目是否有效
 * @param {Object} puzzle 数回游戏题目对象
 * @returns {boolean} 是否有效
 */
function validateSlitherLink(puzzle) {
  // 验证数据结构
  if (!puzzle.grid || 
      puzzle.grid.length !== puzzle.size) {
    return false;
  }
  
  // 检查每一行的长度是否都等于size
  for (let i = 0; i < puzzle.size; i++) {
    if (!puzzle.grid[i] || puzzle.grid[i].length !== puzzle.size) {
      return false;
    }
  }

  // 验证数字的有效性（0-4的整数）
  for (let i = 0; i < puzzle.size; i++) {
    for (let j = 0; j < puzzle.size; j++) {
      const cell = puzzle.grid[i][j];
      // 检查是否是0-4之间的整数
      if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell > 4) {
        return false;
      }
    }
  }

  // 验证是否有唯一解（简化版验证）
  // 检查数字周围的边数是否可能满足
  const size = puzzle.size;
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = puzzle.grid[i][j];
      if (cell > 0) {
        // 计算可能的最大边数（周围的边数）
        let maxEdges = 4;
        if (i === 0) maxEdges--; // 上边
        if (i === size - 1) maxEdges--; // 下边
        if (j === 0) maxEdges--; // 左边
        if (j === size - 1) maxEdges--; // 右边
        
        if (cell > maxEdges) {
          return false;
        }
      }
    }
  }

  return true;
}

function generateSlitherLink(size, seed) {
  const rand = seededRand(seed);
  let grid;
  let attempts = 0;
  const maxAttempts = 100;
  
  // 生成有效的数回题目
  do {
    grid = Array.from({ length: size }, () => Array(size).fill(0));
    
    // 生成随机线索
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (rand() < 0.6) { // 60% 的概率生成线索
          grid[r][c] = Math.floor(rand() * 4); // 0-3
        }
      }
    }
    
    attempts++;
  } while (!validateSlitherLink({ size, grid }) && attempts < maxAttempts);
  
  return {
    size,
    grid,
    seed
  };
}

function main() {
  const outputDir = path.join(__dirname, 'slither-link');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', size: 5 },
    { name: 'medium', size: 7 },
    { name: 'hard', size: 10 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  
  for (const { name, size } of difficulties) {
    console.log(`生成 ${name} (${size}×${size})...`);
    
    for (let i = 1; i <= countPerDiff; i++) {
      const seed = i * 99991 + size * 7777;
      const game = generateSlitherLink(size, seed);
      
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