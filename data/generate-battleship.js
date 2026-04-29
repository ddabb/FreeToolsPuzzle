/**
 * 战舰游戏批量生成 - 每个题目单独文件
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

function generateBattleship(size, seed) {
  const rand = seededRand(seed);
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  
  // 根据难度调整战舰配置
  let shipSizes;
  if (size === 6) {
    shipSizes = [3, 2, 2, 1, 1]; // 6×6配置
  } else if (size === 8) {
    shipSizes = [4, 3, 2, 2, 1, 1, 1]; // 8×8配置
  } else {
    shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]; // 10×10标准配置
  }
  
  const ships = [];
  let maxAttempts = 1000; // 防止无限循环
  
  for (const shipSize of shipSizes) {
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < maxAttempts) {
      attempts++;
      const isHorizontal = rand() > 0.5;
      let r, c;
      
      if (isHorizontal) {
        r = Math.floor(rand() * size);
        c = Math.floor(rand() * (size - shipSize + 1));
      } else {
        r = Math.floor(rand() * (size - shipSize + 1));
        c = Math.floor(rand() * size);
      }
      
      // 检查是否可以放置
      let canPlace = true;
      for (let i = 0; i < shipSize; i++) {
        const nr = isHorizontal ? r : r + i;
        const nc = isHorizontal ? c + i : c;
        
        // 检查边界
        if (nr >= size || nc >= size) {
          canPlace = false;
          break;
        }
        
        // 检查周围是否有其他战舰
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const checkR = nr + dr;
            const checkC = nc + dc;
            if (checkR >= 0 && checkR < size && checkC >= 0 && checkC < size) {
              if (grid[checkR][checkC] === 1) {
                canPlace = false;
                break;
              }
            }
          }
          if (!canPlace) break;
        }
        if (!canPlace) break;
      }
      
      if (canPlace) {
        // 放置战舰
        for (let i = 0; i < shipSize; i++) {
          const nr = isHorizontal ? r : r + i;
          const nc = isHorizontal ? c + i : c;
          grid[nr][nc] = 1;
        }
        ships.push({ size: shipSize, r, c, horizontal: isHorizontal });
        placed = true;
      }
    }
    
    // 如果无法放置，重新生成整个游戏
    if (!placed) {
      return generateBattleship(size, seed + 1);
    }
  }
  
  // 计算行和列的线索
  const rowClues = grid.map(row => row.reduce((sum, cell) => sum + cell, 0));
  const colClues = Array.from({ length: size }, (_, c) => 
    grid.reduce((sum, row) => sum + row[c], 0)
  );
  
  return {
    size,
    grid,
    ships,
    rowClues,
    colClues,
    seed
  };
}

function main() {
  const outputDir = path.join(__dirname, 'battleship');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', size: 6 },
    { name: 'medium', size: 8 },
    { name: 'hard', size: 10 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  
  for (const { name, size } of difficulties) {
    console.log(`生成 ${name} (${size}×${size})...`);
    
    for (let i = 1; i <= countPerDiff; i++) {
      const seed = i * 99991 + size * 7777;
      const game = generateBattleship(size, seed);
      
      const item = {
        id: i,
        difficulty: name,
        size: game.size,
        rowClues: game.rowClues,
        colClues: game.colClues,
        ships: game.ships,
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