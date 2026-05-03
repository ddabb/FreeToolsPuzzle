// 测试唯一解求解器
const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

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

// 测试1：简单题目
function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

const test1 = createEmptyGrid(6);
test1[1][1] = CELL_TREE;
test1[1][3] = CELL_TREE;
test1[3][1] = CELL_TREE;
test1[3][3] = CELL_TREE;

console.log('测试1: 4棵树在四角');
console.log(test1.map(r => r.map(c => c === 1 ? 'T' : '.').join(' ')).join('\n'));
console.log('解的数量:', countSolutions(test1, 6, 10));

// 测试2：检查现有题目
const fs = require('fs');
const path = require('path');

const sampleFile = path.join(__dirname, 'data', 'tents', 'easy', 'easy-0001.json');
const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));

console.log('\n测试2: 现有题目 easy-0001.json');
console.log('网格大小:', sample.size);
console.log('树数量:', Object.keys(sample.tents).length);
console.log('解的数量:', countSolutions(sample.grid, sample.size, 10));
