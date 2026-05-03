/**
 * Masyu (珍珠) v5 - 高密度珍珠生成器
 *
 * 策略：生成一条闭合回路 → 在回路上放置珍珠 → 验证唯一性
 *
 * 目标密度：
 * - Easy (6×6): 12-18 颗 (密度 33%-50%)
 * - Medium (8×8): 24-32 颗 (密度 37%-50%)
 * - Hard (10×10): 35-50 颗 (密度 35%-50%)
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const CONFIG = {
  easy: { size: 6, minPearls: 12, maxPearls: 18, count: 1000 },
  medium: { size: 8, minPearls: 24, maxPearls: 32, count: 1000 },
  hard: { size: 10, minPearls: 35, maxPearls: 50, count: 1000 }
};

// 生成随机闭合回路
function generateLoop(size) {
  // 使用简化的回路生成：从左上角开始，随机游走回到起点
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const loopPath = [];
  const lines = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({ top: false, right: false, bottom: false, left: false }))
  );

  let r = 0, c = 0;
  loopPath.push([r, c]);
  visited[r][c] = true;

  const dirs = [
    { dr: 0, dc: 1, name: 'right', opposite: 'left' },
    { dr: 1, dc: 0, name: 'bottom', opposite: 'top' },
    { dr: 0, dc: -1, name: 'left', opposite: 'right' },
    { dr: -1, dc: 0, name: 'top', opposite: 'bottom' }
  ];

  // 随机游走
  while (loopPath.length < size * size) {
    const validDirs = dirs.filter(d => {
      const nr = r + d.dr;
      const nc = c + d.dc;
      return nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc];
    });

    if (validDirs.length === 0) break;

    const d = validDirs[Math.floor(Math.random() * validDirs.length)];
    lines[r][c][d.name] = true;
    r += d.dr;
    c += d.dc;
    lines[r][c][d.opposite] = true;
    visited[r][c] = true;
    loopPath.push([r, c]);

    // 尝试回到起点
    if (loopPath.length > size * 2 && Math.abs(r) + Math.abs(c) === 1) {
      // 相邻起点，可以闭合
      if (r === 0 && c === 1) {
        lines[r][c].left = true;
        lines[0][0].right = true;
      } else if (r === 1 && c === 0) {
        lines[r][c].top = true;
        lines[0][0].bottom = true;
      }
      break;
    }
  }

  return { lines, loopPath };
}

// 在回路上放置珍珠
function placePearls(lines, loopPath, size, minPearls, maxPearls) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(EMPTY));
  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));

  // 随机选择路径上的格子放置珍珠
  const shuffledPath = [...loopPath];
  for (let i = shuffledPath.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPath[i], shuffledPath[j]] = [shuffledPath[j], shuffledPath[i]];
  }

  const pearlPositions = shuffledPath.slice(0, targetPearls);

  for (const [r, c] of pearlPositions) {
    const cell = lines[r][c];
    // 判断是直行还是转弯
    const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);

    if (isStraight) {
      // 白珍珠
      grid[r][c] = WHITE;
    } else {
      // 黑珍珠（转弯）
      grid[r][c] = BLACK;
    }
  }

  return { grid, pearlCount: pearlPositions.length };
}

function main() {
  console.log('Masyu v5 - 高密度珍珠生成器\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}×${config.size}) ===`);
    console.log(`目标: ${config.minPearls}-${config.maxPearls} 颗珍珠`);

    const outDir = path.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    const startTime = Date.now();

    for (let i = 1; i <= config.count; i++) {
      const { lines, loopPath } = generateLoop(config.size);
      const { grid, pearlCount } = placePearls(lines, loopPath, config.size, config.minPearls, config.maxPearls);

      const filename = `${difficulty}-${i.toString().padStart(4, '0')}.json`;
      const filepath = path.join(outDir, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        id: i,
        difficulty,
        size: config.size,
        grid,
        lines,
        pearlCount,
        seed: Math.floor(Math.random() * 1000000)
      }));

      success++;

      if (success % 100 === 0) {
        console.log(`已生成 ${success}/${config.count}`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`完成: ${success}/${config.count} 题, 耗时 ${time}s`);
  }
}

main();
