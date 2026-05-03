/**
 * 帐篷 (Tents) 唯一解生成器 v2 - 测试版
 * 只生成少量题目验证逻辑
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const TEST_COUNT = 10; // 测试只生成10题

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
}

function countSolutions(grid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return 0;
  
  let solutionCount = 0;
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => grid[nr][nc] === CELL_EMPTY)
  );
  
  if (tentPlacements.some(p => p.length === 0)) return 0;
  
  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= maxCount) return;
    if (treeIndex === trees.length) { solutionCount++; return; }
    
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
  return solutionCount;
}

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

// 唯一解题目生成
function generateUniquePuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 200;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));
    
    // 随机放置树
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    shuffle(cells);
    
    const treePositions = [];
    for (let i = 0; i < Math.min(targetTrees, cells.length); i++) {
      const [r, c] = cells[i];
      grid[r][c] = CELL_TREE;
      treePositions.push([r, c]);
    }
    
    // 尝试为每棵树分配帐篷
    const tentPositions = new Set();
    let valid = true;
    
    shuffle(treePositions);
    for (const [tr, tc] of treePositions) {
      const neighbors = getNeighbors(tr, tc, size);
      shuffle(neighbors);
      
      let placed = false;
      for (const [nr, nc] of neighbors) {
        if (grid[nr][nc] === CELL_EMPTY) {
          let adjacentTent = false;
          for (const [ar, ac] of getNeighbors(nr, nc, size)) {
            if (tentPositions.has(`${ar},${ac}`)) {
              adjacentTent = true;
              break;
            }
          }
          
          if (!adjacentTent) {
            grid[nr][nc] = CELL_TENT;
            tentPositions.add(`${nr},${nc}`);
            placed = true;
            break;
          }
        }
      }
      
      if (!placed) {
        valid = false;
        break;
      }
    }
    
    if (!valid) continue;
    
    // 创建题目网格（只保留树）
    const puzzleGrid = createEmptyGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) {
          puzzleGrid[r][c] = CELL_TREE;
        }
      }
    }
    
    // 验证唯一解
    const solCount = countSolutions(puzzleGrid, size, 2);
    
    if (solCount === 1) {
      const tents = {};
      for (const pos of tentPositions) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount: treePositions.length };
    }
    
    // 多解：尝试增加树来约束
    if (solCount > 1) {
      const emptyCells = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (puzzleGrid[r][c] === CELL_EMPTY) {
            emptyCells.push([r, c]);
          }
        }
      }
      shuffle(emptyCells);
      
      for (const [er, ec] of emptyCells.slice(0, 8)) {
        const testGrid = cloneGrid(puzzleGrid);
        testGrid[er][ec] = CELL_TREE;
        
        const testCount = countSolutions(testGrid, size, 2);
        if (testCount === 1) {
          const tents = {};
          for (const pos of tentPositions) {
            tents[pos] = true;
          }
          return { grid: testGrid, tents, treeCount: treePositions.length + 1 };
        }
      }
    }
  }
  
  return null;
}

// 测试生成
console.log('测试唯一解生成器...\n');

const configs = [
  { size: 6, minTrees: 5, maxTrees: 7 },
  { size: 8, minTrees: 8, maxTrees: 11 },
  { size: 10, minTrees: 12, maxTrees: 16 }
];

for (const config of configs) {
  console.log(`测试 ${config.size}x${config.size} (目标树: ${config.minTrees}-${config.maxTrees})...`);
  
  const startTime = Date.now();
  let success = 0;
  
  for (let i = 0; i < TEST_COUNT; i++) {
    const puzzle = generateUniquePuzzle(config.size, config.minTrees, config.maxTrees);
    if (puzzle) {
      success++;
      console.log(`  第${i + 1}题: 树=${puzzle.treeCount}, 帐篷=${Object.keys(puzzle.tents).length}`);
    } else {
      console.log(`  第${i + 1}题: 生成失败`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`  成功率: ${success}/${TEST_COUNT} (${elapsed}s)\n`);
}
