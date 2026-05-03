/**
 * 珍珠 (Masyu) 游戏题目生成器 - 简化版
 * 规则：
 * 1. 用线画闭合回路
 * 2. 线条不能交叉或分叉
 * 3. 黑珍珠：线条穿过并成直角转弯
 * 4. 白珍珠：线条穿过并直线通过，但进入前必须转弯
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minPearls: 3, maxPearls: 6 },
  medium: { size: 8, count: 1000, minPearls: 4, maxPearls: 8 },
  hard: { size: 10, count: 1000, minPearls: 5, maxPearls: 10 }
};

const OUTPUT_DIR = path.join(__dirname, 'data', 'masyu');
const CELL_EMPTY = 0;
const CELL_WHITE = 1;
const CELL_BLACK = 2;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function createEmptyLines(size) {
  return Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({
      top: false, right: false, bottom: false, left: false
    }))
  );
}

function generateRectLoop(size) {
  const margin = 1;
  const minX = margin;
  const maxX = size - margin - 1;
  const minY = margin;
  const maxY = size - margin - 1;

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width < 3 || height < 3) return null;

  const grid = createEmptyGrid(size);
  const lines = createEmptyLines(size);

  const loopCells = [];

  for (let x = minX; x <= maxX; x++) {
    loopCells.push([minY, x]);
  }
  for (let y = minY + 1; y <= maxY; y++) {
    loopCells.push([y, maxX]);
  }
  for (let x = maxX - 1; x >= minX; x--) {
    loopCells.push([maxY, x]);
  }
  for (let y = maxY - 1; y >= minY + 1; y--) {
    loopCells.push([y, minX]);
  }

  for (let i = 0; i < loopCells.length; i++) {
    const [r, c] = loopCells[i];
    const [nextR, nextC] = loopCells[(i + 1) % loopCells.length];

    if (r === nextR) {
      if (c < nextC) {
        lines[r][c].right = true;
        lines[r][nextC].left = true;
      } else {
        lines[r][c].left = true;
        lines[r][nextC].right = true;
      }
    } else {
      if (r < nextR) {
        lines[r][c].bottom = true;
        lines[nextR][c].top = true;
      } else {
        lines[r][c].top = true;
        lines[nextR][c].bottom = true;
      }
    }
  }

  return { grid, lines, loopCells };
}

function addPearlsSimple(grid, lines, size, loopCells, minPearls, maxPearls) {
  const pearlCount = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));

  const candidates = [];

  for (let i = 0; i < loopCells.length; i++) {
    const [r, c] = loopCells[i];
    const [prevR, prevC] = loopCells[(i - 1 + loopCells.length) % loopCells.length];
    const [nextR, nextC] = loopCells[(i + 1) % loopCells.length];

    const isTurn = !((prevR === nextR) || (prevC === nextC));

    candidates.push({ r, c, isTurn, index: i });
  }

  shuffle(candidates);

  let added = 0;
  const usedIndices = new Set();

  for (const candidate of candidates) {
    if (added >= pearlCount) break;
    if (usedIndices.has(candidate.index)) continue;

    usedIndices.add(candidate.index);

    if (candidate.isTurn) {
      if (Math.random() > 0.4) {
        grid[candidate.r][candidate.c] = CELL_BLACK;
        added++;
      }
    } else {
      if (Math.random() > 0.5) {
        grid[candidate.r][candidate.c] = CELL_WHITE;
        added++;
      }
    }
  }

  return added >= minPearls;
}

function generatePuzzle(size, minPearls, maxPearls) {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const loop = generateRectLoop(size);
    if (!loop) continue;

    const grid = createEmptyGrid(size);
    if (!addPearlsSimple(grid, loop.lines, size, loop.loopCells, minPearls, maxPearls)) {
      continue;
    }

    return { grid, lines: loop.lines };
  }

  return null;
}

function generateAll() {
  console.log('开始生成珍珠题目...\n');
  ensureDir(OUTPUT_DIR);

  let total = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);

    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);

    let success = 0;
    let fail = 0;
    const startTime = Date.now();

    for (let i = 1; i <= config.count; i++) {
      const puzzle = generatePuzzle(config.size, config.minPearls, config.maxPearls);

      if (puzzle) {
        const fileId = String(i).padStart(4, '0');
        const filename = `${difficulty}-${fileId}.json`;
        const filepath = path.join(difficultyDir, filename);

        const data = {
          id: i,
          difficulty: difficulty,
          size: config.size,
          grid: puzzle.grid,
          lines: puzzle.lines,
          seed: Math.floor(Math.random() * 1000000)
        };

        fs.writeFileSync(filepath, JSON.stringify(data));
        success++;
      } else {
        fail++;
      }

      if (i % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${i}/${config.count} (${elapsed}s)`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  完成! 成功: ${success}, 失败: ${fail}, 耗时: ${time}s\n`);
    total += success;
  }

  console.log(`总计生成 ${total} 道题目`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

generateAll();