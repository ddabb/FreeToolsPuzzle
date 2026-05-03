/**
 * 简化版 Masyu 题目生成器
 * 首先确保有有效的闭合回路，珍珠规则正确
 * 然后再添加唯一性检查
 */

const fs = require('fs');
const path = require('path');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const CONFIG = {
  easy:   { size: 6,  minPearls: 8,  maxPearls: 14, swaps: 30, count: 1000 },
  medium: { size: 8,  minPearls: 14, maxPearls: 24, swaps: 60, count: 1000 },
  hard:   { size: 10, minPearls: 22, maxPearls: 36, swaps: 100, count: 1000 }
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

function generatePuzzle(config) {
  const { size, minPearls, maxPearls, swaps } = config;
  
  for (let attempt = 0; attempt < 1000; attempt++) {
    const path = generateRandomLoop(size, swaps);
    const lines = pathToLines(path, size);
    
    const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
    
    const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
    
    const candidateCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const l = lines[r][c];
        const ec = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
        if (ec === 2) {
          const isStraight = (l.top && l.bottom) || (l.left && l.right);
          candidateCells.push({ r, c, isStraight });
        }
      }
    }
    
    shuffle(candidateCells);
    
    const blackCount = Math.max(3, Math.round(targetPearls * 0.4));
    let selectedBlacks = 0, selectedWhites = 0;
    const selected = [];
    
    for (const cell of candidateCells) {
      if (selectedBlacks + selectedWhites >= targetPearls) break;
      
      if (cell.isStraight && selectedWhites < targetPearls - blackCount) {
        selected.push(cell);
        selectedWhites++;
      } else if (!cell.isStraight && selectedBlacks < blackCount) {
        selected.push(cell);
        selectedBlacks++;
      }
    }
    
    for (const cell of selected) {
      grid[cell.r][cell.c] = cell.isStraight ? WHITE : BLACK;
    }
    
    const actualCount = selected.length;
    if (actualCount < minPearls) continue;
    
    const pearlCount = actualCount;
    const finalBlackCount = selected.filter(c => !c.isStraight).length;
    const finalWhiteCount = selected.filter(c => c.isStraight).length;
    
    if (finalBlackCount === 0 || finalWhiteCount === 0) continue;
    
    const valid = validateSolution(lines, grid, size);
    if (!valid) continue;
    
    return {
      grid,
      lines,
      pearlCount,
      blackCount: finalBlackCount,
      whiteCount: finalWhiteCount
    };
  }
  
  return null;
}

function validateSolution(lines, grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      const ec = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
      
      if (grid[r][c] !== EMPTY && ec !== 2) return false;
      
      if (ec !== 2 && ec !== 0) return false;
      
      const isStraight = (l.top && l.bottom) || (l.left && l.right);
      if (grid[r][c] === BLACK && isStraight) return false;
      if (grid[r][c] === WHITE && !isStraight) return false;
    }
  }
  
  let hasEdge = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      if (l.top || l.right || l.bottom || l.left) {
        hasEdge = true;
        break;
      }
    }
    if (hasEdge) break;
  }
  
  return hasEdge;
}

function main() {
  console.log('=== 重新生成 Masyu 题目 ===\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    const dir = path.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`${difficulty}: 生成 ${config.count} 个题目...`);
    const startTime = Date.now();
    
    let successCount = 0;
    let attempt = 0;
    
    while (successCount < config.count && attempt < config.count * 1000) {
      attempt++;
      const puzzle = generatePuzzle(config);
      
      if (!puzzle) continue;
      
      successCount++;
      
      const filename = `${difficulty}-${String(successCount).padStart(4, '0')}.json`;
      const filepath = path.join(dir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify({
        id: successCount,
        difficulty,
        size: config.size,
        grid: puzzle.grid,
        lines: puzzle.lines,
        pearlCount: puzzle.pearlCount,
        blackCount: puzzle.blackCount,
        whiteCount: puzzle.whiteCount
      }));
      
      if (successCount % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${difficulty}: ${successCount}/${config.count} (${elapsed}s)`);
      }
    }
    
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${difficulty}: 完成 ${successCount} 个题目 (${totalElapsed}s)\n`);
  }

  console.log('全部完成！');
}

main();