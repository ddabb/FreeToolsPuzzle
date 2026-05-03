/**
 * 生成缺失的帐篷题目 (0001-1000 格式)
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const DATA_DIR = 'f:/SelfJob/FreeToolsPuzzle/data/tents';

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function countSolutions(puzzleGrid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return { count: 0, solution: null };

  let solutionCount = 0;
  let oneSolution = null;

  const tentPlacements = trees.map(([tr, tc]) =>
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );

  if (tentPlacements.some(p => p.length === 0)) return { count: 0, solution: null };

  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= maxCount) return;
    if (treeIndex === trees.length) {
      solutionCount++;
      if (!oneSolution) oneSolution = new Set(placedTents);
      return;
    }

    for (const [tr, tc] of tentPlacements[treeIndex]) {
      if (placedTents.has(`${tr},${tc}`)) continue;
      let adjacent = false;
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (placedTents.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;
      placedTents.add(`${tr},${tc}`);
      backtrack(treeIndex + 1, placedTents);
      placedTents.delete(`${tr},${tc}`);
      if (solutionCount >= maxCount) return;
    }
  }

  backtrack(0, new Set());
  return { count: solutionCount, solution: oneSolution };
}

function generateCompact(size, regionStart, regionSize, targetTrees) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const trees = [];
  const tents = new Set();

  const [startR, startC] = regionStart;
  const positions = [];

  for (let r = startR; r < startR + regionSize && r < size; r++) {
    for (let c = startC; c < startC + regionSize && c < size; c++) {
      positions.push([r, c]);
    }
  }

  shuffle(positions);

  for (const [tr, tc] of positions) {
    if (trees.length >= targetTrees) break;
    if (grid[tr][tc] !== CELL_EMPTY) continue;

    const tentSpots = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
      if (grid[nr][nc] !== CELL_EMPTY) return false;
      for (const [tr2, tc2] of getNeighbors(nr, nc, size)) {
        if (tents.has(`${tr2},${tc2}`)) return false;
      }
      return true;
    });

    if (tentSpots.length === 0) continue;

    shuffle(tentSpots);
    const [tenr, tenc] = tentSpots[0];

    grid[tr][tc] = CELL_TREE;
    grid[tenr][tenc] = CELL_TENT;
    trees.push([tr, tc]);
    tents.add(`${tenr},${tenc}`);
  }

  return { grid, trees, tents };
}

function generateOne(size, minTrees, maxTrees, maxAttempts = 50000) {
  const regionSizeMin = Math.max(3, Math.floor(size * 0.6));
  const regionSizeMax = size;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const regionSize = regionSizeMin + Math.floor(Math.random() * (regionSizeMax - regionSizeMin + 1));
    const treeCount = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));

    const startR = Math.floor(Math.random() * (size - regionSize + 1));
    const startC = Math.floor(Math.random() * (size - regionSize + 1));

    const { grid, trees, tents } = generateCompact(size, [startR, startC], regionSize, treeCount);

    if (trees.length < minTrees - 1) continue;

    const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    for (const [tr, tc] of trees) {
      puzzleGrid[tr][tc] = CELL_TREE;
    }

    const result = countSolutions(puzzleGrid, size, 2);

    if (result.count === 1) {
      const tentsObj = {};
      for (const pos of result.solution) {
        tentsObj[pos] = true;
      }
      return { grid: puzzleGrid, tents: tentsObj, treeCount: trees.length };
    }
  }

  return null;
}

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minTrees: 4, maxTrees: 8 },
  medium: { size: 8, count: 1000, minTrees: 6, maxTrees: 12 },
  hard: { size: 10, count: 1000, minTrees: 8, maxTrees: 16 }
};

function main() {
  console.log('=== 生成缺失的题目 (0001-1000格式) ===\n');

  const startTime = Date.now();
  let totalGenerated = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const dir = path.join(DATA_DIR, difficulty);
    console.log(`处理 ${difficulty}...`);

    let successCount = 0;
    let i = 1;

    while (i <= config.count) {
      const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
      const filepath = path.join(dir, filename);

      if (fs.existsSync(filepath)) {
        i++;
        continue;
      }

      console.log(`生成缺失: ${filename}`);
      const puzzle = generateOne(config.size, config.minTrees, config.maxTrees);

      if (puzzle) {
        const data = {
          id: i,
          difficulty,
          size: config.size,
          grid: puzzle.grid,
          tents: puzzle.tents,
          treeCount: puzzle.treeCount,
          unique: true,
          seed: Math.floor(Math.random() * 1000000)
        };

        fs.writeFileSync(filepath, JSON.stringify(data));
        successCount++;
      }

      i++;
    }

    totalGenerated += successCount;
    console.log(`  ${difficulty}: 生成了 ${successCount} 个缺失文件\n`);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`完成! 新增: ${totalGenerated} 个文件, 耗时: ${totalTime}s`);
}

main();
