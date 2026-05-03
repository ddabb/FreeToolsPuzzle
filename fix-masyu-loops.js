/**
 * 修复 Masyu 题目 - 重新生成有效的闭合回路
 * 保持原有的 grid/pearl 布局不变，只重新生成 lines
 */

const fs = require('fs');
const path = require('path');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const CONFIG = {
  easy:   { size: 6,  minPearls: 8,  maxPearls: 14, swaps: 30 },
  medium: { size: 8,  minPearls: 14, maxPearls: 24, swaps: 60 },
  hard:   { size: 10, minPearls: 22, maxPearls: 36, swaps: 100 }
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateSnakePath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push([r, c]);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  return path;
}

function isValidPath(path, size) {
  if (path.length !== size * size) return false;
  const seen = new Set();
  for (const [r, c] of path) {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const key = r * size + c;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function isClosedLoop(path) {
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % n];
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;
  }
  return true;
}

function twoOptSwap(path, i, j) {
  const newPath = [...path];
  let left = i, right = j;
  while (left < right) {
    [newPath[left], newPath[right]] = [newPath[right], newPath[left]];
    left++;
    right--;
  }
  return newPath;
}

function randomLocalRewire(path, size) {
  const n = path.length;
  const posMap = new Map();
  for (let i = 0; i < n; i++) {
    posMap.set(path[i][0] * size + path[i][1], i);
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const i = Math.floor(Math.random() * n);
    const [r1, c1] = path[i];

    const neighbors = [];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r1 + dr, nc = c1 + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const j = posMap.get(nr * size + nc);
        if (j !== undefined) {
          const dist = Math.abs(j - i);
          if (dist > 1 && dist < n - 1) {
            neighbors.push(j);
          }
        }
      }
    }

    if (neighbors.length === 0) continue;

    const j = neighbors[Math.floor(Math.random() * neighbors.length)];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);

    const newPath = twoOptSwap(path, lo + 1, hi - 1);

    if (isClosedLoop(newPath) && isValidPath(newPath, size)) {
      return newPath;
    }
  }

  return null;
}

function generateRandomLoop(size, numSwaps) {
  let path = generateSnakePath(size);

  let swapCount = 0;
  for (let i = 0; i < numSwaps * 3; i++) {
    const newPath = randomLocalRewire(path, size);
    if (newPath) {
      path = newPath;
      swapCount++;
      if (swapCount >= numSwaps) break;
    }
  }

  const transforms = [
    (p) => p.map(([r, c]) => [r, c]),
    (p) => p.map(([r, c]) => [r, size - 1 - c]),
    (p) => p.map(([r, c]) => [size - 1 - r, c]),
    (p) => p.map(([r, c]) => [size - 1 - r, size - 1 - c]),
    (p) => p.map(([r, c]) => [c, size - 1 - r]),
    (p) => p.map(([r, c]) => [size - 1 - c, r]),
  ];

  const transform = transforms[Math.floor(Math.random() * transforms.length)];
  path = transform(path);

  const offset = Math.floor(Math.random() * path.length);
  path = [...path.slice(offset), ...path.slice(0, offset)];

  return path;
}

function pathToLines(path, size) {
  const lines = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );

  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];

    if (r2 === r1 - 1) { lines[r1][c1].top = true; lines[r2][c2].bottom = true; }
    else if (r2 === r1 + 1) { lines[r1][c1].bottom = true; lines[r2][c2].top = true; }
    else if (c2 === c1 - 1) { lines[r1][c1].left = true; lines[r2][c2].right = true; }
    else if (c2 === c1 + 1) { lines[r1][c1].right = true; lines[r2][c2].left = true; }
  }

  return lines;
}

function regenerateLines(grid, size, numSwaps) {
  const pearls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== EMPTY) {
        pearls.push([r, c]);
      }
    }
  }

  const requiredPearls = new Set(pearls.map(([r, c]) => `${r},${c}`));

  for (let attempt = 0; attempt < 100; attempt++) {
    const path = generateRandomLoop(size, numSwaps);
    const lines = pathToLines(path, size);

    let valid = true;
    for (const [pr, pc] of pearls) {
      const cell = lines[pr][pc];
      const edgeCount = (cell.top ? 1 : 0) + (cell.right ? 1 : 0) +
                        (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0);
      if (edgeCount !== 2) { valid = false; break; }

      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      const cellType = grid[pr][pc];
      if (cellType === WHITE && !isStraight) { valid = false; break; }
      if (cellType === BLACK && isStraight) { valid = false; break; }
    }

    if (valid) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = lines[r][c];
          const edgeCount = (cell.top ? 1 : 0) + (cell.right ? 1 : 0) +
                            (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0);
          if (edgeCount === 1) { valid = false; break; }
        }
        if (!valid) break;
      }
    }

    if (valid) return lines;
  }

  return null;
}

function fixPuzzle(filepath) {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const difficulty = data.difficulty;
  const config = CONFIG[difficulty];

  if (!config) return { success: false, reason: 'Unknown difficulty' };

  let grid = data.grid;
  if (typeof grid[0][0] === 'string') {
    grid = grid.map(row => row.map(cell => {
      if (cell === 'B') return BLACK;
      if (cell === 'W') return WHITE;
      return EMPTY;
    }));
  }

  const newLines = regenerateLines(grid, data.size, config.swaps);

  if (!newLines) {
    return { success: false, reason: 'Could not generate valid lines' };
  }

  const pearlCount = grid.flat().filter(c => c !== EMPTY).length;
  const blackCount = grid.flat().filter(c => c === BLACK).length;
  const whiteCount = pearlCount - blackCount;

  const newData = {
    id: data.id,
    difficulty: data.difficulty,
    size: data.size,
    grid: grid,
    lines: newLines,
    pearlCount,
    blackCount,
    whiteCount
  };

  fs.writeFileSync(filepath, JSON.stringify(newData));
  return { success: true };
}

function main() {
  console.log('=== 修复 Masyu 题目 ===\n');

  let totalFixed = 0, totalFailed = 0;

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    const dir = path.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(dir)) {
      console.log(`${difficulty}: 目录不存在\n`);
      continue;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    console.log(`${difficulty}: 处理 ${files.length} 个文件...`);

    let fixed = 0, failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filepath = path.join(dir, file);
      const result = fixPuzzle(filepath);

      if (result.success) {
        fixed++;
      } else {
        failed++;
        console.log(`  ${file}: 失败 - ${result.reason}`);
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  进度: ${i + 1}/${files.length}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    totalFixed += fixed;
    totalFailed += failed;
    console.log(`${difficulty}: 修复=${fixed}, 失败=${failed} (${elapsed}s)\n`);
  }

  console.log(`总计: 修复=${totalFixed}, 失败=${totalFailed}`);
}

main();