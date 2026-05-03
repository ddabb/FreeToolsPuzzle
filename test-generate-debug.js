const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
}

function isValidTentPosition(grid, r, c, size, existingTents) {
  if (grid[r][c] !== CELL_EMPTY) return false;
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (existingTents.has(`${nr},${nc}`)) return false;
  }
  return true;
}

function countSolutions(puzzleGrid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return 0;
  
  let solutionCount = 0;
  
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );
  
  if (tentPlacements.some(p => p.length === 0)) return 0;
  
  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= maxCount) return;
    if (treeIndex === trees.length) { 
      solutionCount++; 
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
  return solutionCount;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 测试一次生成
function testGenerate() {
  console.log('测试单次生成...\n');
  
  const size = 10;
  const initialTrees = 5;
  const maxTrees = 12;
  const maxIterations = 15;
  
  const fullGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const tentPositions = new Set();
  const treePositions = [];
  
  // 阶段1：放置初始树+帐篷
  console.log('阶段1：放置初始树+帐篷');
  let placed = 0;
  const maxTries = size * size * 3;
  let tries = 0;
  
  while (placed < initialTrees && tries < maxTries) {
    tries++;
    const tr = Math.floor(Math.random() * size);
    const tc = Math.floor(Math.random() * size);
    
    if (fullGrid[tr][tc] !== CELL_EMPTY) continue;
    
    const tentNeighbors = getNeighbors(tr, tc, size).filter(([nr, nc]) => 
      isValidTentPosition(fullGrid, nr, nc, size, tentPositions)
    );
    
    if (tentNeighbors.length === 0) continue;
    
    shuffle(tentNeighbors);
    const [tenr, tenc] = tentNeighbors[0];
    
    fullGrid[tr][tc] = CELL_TREE;
    fullGrid[tenr][tenc] = CELL_TENT;
    tentPositions.add(`${tenr},${tenc}`);
    treePositions.push([tr, tc]);
    placed++;
  }
  
  console.log(`放置了 ${placed} 棵树，尝试 ${tries} 次`);
  
  if (placed < initialTrees) {
    console.log('阶段1失败：无法放置足够的初始树');
    return;
  }
  
  // 阶段2：迭代添加约束
  console.log('\n阶段2：迭代添加约束');
  
  for (let iter = 0; iter < maxIterations && treePositions.length < maxTrees; iter++) {
    const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    for (const [tr, tc] of treePositions) {
      puzzleGrid[tr][tc] = CELL_TREE;
    }
    
    const count = countSolutions(puzzleGrid, size, 3);
    console.log(`迭代 ${iter + 1}: 树数=${treePositions.length}, 解数=${count}`);
    
    if (count === 1) {
      console.log('\n✅ 成功！找到唯一解');
      return;
    }
    
    if (count === 0) {
      console.log('\n❌ 失败：无解');
      return;
    }
    
    // 多解，添加新约束
    const candidates = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (fullGrid[r][c] === CELL_EMPTY) {
          const tentOptions = getNeighbors(r, c, size).filter(([nr, nc]) => 
            isValidTentPosition(fullGrid, nr, nc, size, tentPositions)
          );
          if (tentOptions.length > 0) {
            candidates.push({ treePos: [r, c], tentOptions });
          }
        }
      }
    }
    
    if (candidates.length === 0) {
      console.log('\n❌ 失败：无法添加更多约束');
      return;
    }
    
    shuffle(candidates);
    const cand = candidates[0];
    const [tr, tc] = cand.treePos;
    shuffle(cand.tentOptions);
    const [tenr, tenc] = cand.tentOptions[0];
    
    fullGrid[tr][tc] = CELL_TREE;
    fullGrid[tenr][tenc] = CELL_TENT;
    tentPositions.add(`${tenr},${tenc}`);
    treePositions.push([tr, tc]);
  }
  
  console.log('\n❌ 失败：达到迭代上限');
}

testGenerate();
