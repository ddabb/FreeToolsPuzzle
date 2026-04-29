/**
 * 重新生成扫雷题目 - 只重新生成没有唯一解的题目
 */

const fs = require('fs');
const path = require('path');
const validateMinesweeper = require('./validators/minesweeper');

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

  let minesPlaced = 0;
  while (minesPlaced < mineCount) {
    const r = Math.floor(rand() * rows);
    const c = Math.floor(rand() * cols);
    if (!board[r][c]) {
      board[r][c] = true;
      minesPlaced++;
    }
  }

  const numbers = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (board[r][c]) return -1;
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
    board,
    numbers
  };
}

function regenerateInvalidPuzzles() {
  const gameDir = path.join(__dirname, 'minesweeper');
  const files = fs.readdirSync(gameDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  
  console.log('开始检查扫雷题目...');
  console.log('找到 ' + files.length + ' 个题目文件');

  const difficulties = [
    { name: 'easy', rows: 9, cols: 9, mines: 10 },
    { name: 'medium', rows: 16, cols: 16, mines: 40 },
    { name: 'hard', rows: 16, cols: 30, mines: 99 }
  ];

  let invalidCount = 0;
  let validCount = 0;
  let regeneratedCount = 0;
  let maxRetries = 100;

  for (const file of files) {
    const filePath = path.join(gameDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const puzzle = JSON.parse(content);

    if (validateMinesweeper(puzzle)) {
      validCount++;
    } else {
      invalidCount++;
      console.log('无效题目: ' + file + ' - 开始重新生成...');

      // 提取难度和ID
      const parts = file.replace('.json', '').split('-');
      const difficulty = parts[0];
      const id = parseInt(parts[1]);

      const diffConfig = difficulties.find(d => d.name === difficulty);
      if (!diffConfig) {
        console.log('无法找到难度配置: ' + difficulty);
        continue;
      }

      // 使用不同的种子重新生成
      let regenerated = false;
      for (let retry = 1; retry <= maxRetries; retry++) {
        const newSeed = puzzle.seed + retry * 99991;
        const game = generateMinesweeper(diffConfig.rows, diffConfig.cols, diffConfig.mines, newSeed);

        const newPuzzle = {
          id: puzzle.id,
          difficulty: puzzle.difficulty,
          rows: game.rows,
          cols: game.cols,
          mineCount: game.mineCount,
          board: game.board,
          numbers: game.numbers,
          seed: newSeed
        };

        if (validateMinesweeper(newPuzzle)) {
          fs.writeFileSync(filePath, JSON.stringify(newPuzzle));
          console.log('  重新生成成功! 新种子: ' + newSeed);
          regeneratedCount++;
          regenerated = true;
          break;
        }
      }

      if (!regenerated) {
        console.log('  重新生成失败: 达到最大重试次数 ' + maxRetries);
      }

      if (invalidCount % 10 === 0) {
        console.log('进度: 无效 ' + invalidCount + ', 已重新生成 ' + regeneratedCount);
      }
    }
  }

  console.log('\n=== 完成 ===');
  console.log('总计: ' + files.length);
  console.log('有效: ' + validCount);
  console.log('无效: ' + invalidCount);
  console.log('已重新生成: ' + regeneratedCount);
  console.log('重新生成失败: ' + (invalidCount - regeneratedCount));
}

regenerateInvalidPuzzles();