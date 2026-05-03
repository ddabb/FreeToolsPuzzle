/**
 * 帐篷 (Tents) 唯一解生成器 v3
 * 策略调整：
 * 1. 降低树数量，减少自由度
 * 2. 从紧凑布局开始，逐步扩展
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

// 调整后的参数：大幅降低树数量
const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minTrees: 3, maxTrees: 5 },
  medium: { size: 8, count: 1000, minTrees: 4, maxTrees: 6 },
  hard: { size: 10, count: 1000, minTrees: 5, maxTrees: 8 }
};

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

// 新策略：从边缘开始紧凑放置树-帐篷对
function generateCompactPuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 300;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));
    
    // 从角落开始放置树-帐篷对
    const corners = shuffle([[0, 0], [0, size-1], [size-1, 0], [size-1, size-1]].slice());
    const tentPositions = new Set();
    const treePositions = [];
    
    let success = true;
    
    for (let i = 0; i < targetTrees; i++) {
      // 找一个空位放树
      let placed = false;
      
      const candidates = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === CELL_EMPTY) {
            candidates.push([r, c]);
          }
        }
      }
      shuffle(candidates);
      
      for (const [tr, tc] of candidates) {
        // 检查这个位置是否可以放树并分配帐篷
        const tentCandidates = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
          if (grid[nr][nc] !== CELL_EMPTY) return false;
          // 检查不与现有帐篷相邻
          for (const [ar, ac] of getNeighbors(nr, nc, size)) {
            if (tentPositions.has(`${ar},${ac}`)) return false;
          }
          return true;
        });
        
        if (tentCandidates.length === 1) {
          // 只有唯一帐篷位置，适合保证唯一解
          grid[tr][tc] = CELL_TREE;
          const [tr2, tc2] = tentCandidates[0];
          grid[tr2][tc2] = CELL_TENT;
          tentPositions.add(`${tr2},${tc2}`);
          treePositions.push([tr, tc]);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        // 尝试随机放置
        for (const [tr, tc] of candidates) {
          grid[tr][tc] = CELL_TREE;
          
          const tentNeighbors = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
            if (grid[nr][nc] !== CELL_EMPTY) return false;
            for (const [ar, ac] of getNeighbors(nr, nc, size)) {
              if (tentPositions.has(`${ar},${ac}`)) return false;
            }
            return true;
          });
          
          if (tentNeighbors.length > 0) {
            shuffle(tentNeighbors);
            const [nr, nc] = tentNeighbors[0];
            grid[nr][nc] = CELL_TENT;
            tentPositions.add(`${nr},${nc}`);
            treePositions.push([tr, tc]);
            placed = true;
            break;
          }
          
          grid[tr][tc] = CELL_EMPTY; // 回退
        }
      }
      
      if (!placed && i >= minTrees) {
        // 已达到最小树数，可以停止
        break;
      } else if (!placed && i < minTrees) {
        success = false;
        break;
      }
    }
    
    if (!success || treePositions.length < minTrees) continue;
    
    // 创建题目网格
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
  }
  
  return null;
}

// 测试
console.log('测试唯一解生成器 v3（紧凑布局）...\n');

const configs = [
  { size: 6, minTrees: 3, maxTrees: 5 },
  { size: 8, minTrees: 4, maxTrees: 6 },
  { size: 10, minTrees: 5, maxTrees: 8 }
];

for (const config of configs) {
  console.log(`测试 ${config.size}x${config.size} (目标树: ${config.minTrees}-${config.maxTrees})...`);
  
  const startTime = Date.now();
  let success = 0;
  
  for (let i = 0; i < 10; i++) {
    const puzzle = generateCompactPuzzle(config.size, config.minTrees, config.maxTrees);
    if (puzzle) {
      success++;
      console.log(`  第${i + 1}题: 树=${puzzle.treeCount}`);
    } else {
      console.log(`  第${i + 1}题: 生成失败`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`  成功率: ${success}/10 (${elapsed}s)\n`);
}
