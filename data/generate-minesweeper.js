/**
 * 扫雷游戏批量生成 - 每个题目单独文件
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

function generateMinesweeper(rows, cols, mineCount, seed) {
  const rand = seededRand(seed);
  const board = Array.from({ length: rows }, () => Array(cols).fill(false));
  
  // 生成地雷
  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const r = Math.floor(rand() * rows);
    const c = Math.floor(rand() * cols);
    if (!board[r][c]) {
      board[r][c] = true;
      minesPlaced++;
    }
  }
  
  // 计算每个格子周围的地雷数
  const numbers = Array.from({ length: rows }, (_, r) => 
    Array.from({ length: cols }, (_, c) => {
      if (board[r][c]) return -1; // -1 表示地雷
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc]) {
            count++;
          }
        }
      }
      return count;
    })
  );
  
  return {
    rows,
    cols,
    mineCount,
    board, // 地雷位置
    numbers // 数字提示
  };
}

function main() {
  const outputDir = path.join(__dirname, 'minesweeper');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', rows: 9, cols: 9, mines: 10 },
    { name: 'medium', rows: 16, cols: 16, mines: 40 },
    { name: 'hard', rows: 16, cols: 30, mines: 99 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  
  for (const { name, rows, cols, mines } of difficulties) {
    console.log(`生成 ${name} (${rows}×${cols}, ${mines}地雷)...`);
    
    for (let i = 1; i <= countPerDiff; i++) {
      const seed = i * 99991 + rows * 7777 + cols * 3333;
      const game = generateMinesweeper(rows, cols, mines, seed);
      
      const item = {
        id: i,
        difficulty: name,
        rows: game.rows,
        cols: game.cols,
        mineCount: game.mineCount,
        board: game.board,
        numbers: game.numbers,
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