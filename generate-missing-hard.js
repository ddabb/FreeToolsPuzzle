/**
 * 只生成缺失的 hard 题目
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

function generateOne(size, minTrees, maxTrees, maxAttempts = 100000) {
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

function main() {
  console.log('=== 只生成缺失的 hard 题目 ===\n');

  const hardDir = path.join(DATA_DIR, 'hard');
  const missing = [];

  for (let i = 1; i <= 1000; i++) {
    const filename = `hard-${String(i).padStart(4, '0')}.json`;
    const filepath = path.join(hardDir, filename);
    if (!fs.existsSync(filepath)) {
      missing.push({ i, filename, filepath });
    }
  }

  console.log(`缺失 ${missing.length} 个 hard 文件\n`);

  let success = 0;
  const startTime = Date.now();

  for (const { i, filename, filepath } of missing) {
    console.log(`生成: ${filename}`);
    const puzzle = generateOne(10, 8, 16, 100000);

    if (puzzle) {
      const data = {
        id: i,
        difficulty: 'hard',
        size: 10,
        grid: puzzle.grid,
        tents: puzzle.tents,
        treeCount: puzzle.treeCount,
        unique: true,
        seed: Math.floor(Math.random() * 1000000)
      };

      fs.writeFileSync(filepath, JSON.stringify(data));
      success++;
      console.log(`  成功 (树=${puzzle.treeCount}棵)`);
    } else {
      console.log(`  失败`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成! 成功: ${success}/${missing.length}, 耗时: ${totalTime}s`);
}

main();
