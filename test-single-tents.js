// 测试单个题目的唯一解
const fs = require('fs');

const CELL_EMPTY = 0;
const CELL_TREE = 1;

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
}

function countSolutions(grid, size, maxCount = 10) {
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
  
  console.log(`树的位置: ${JSON.stringify(trees)}`);
  console.log(`每棵树的帐篷选项: ${JSON.stringify(tentPlacements)}`);
  
  if (tentPlacements.some(p => p.length === 0)) return 0;
  
  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= maxCount) return;
    if (treeIndex === trees.length) { 
      solutionCount++; 
      console.log(`解${solutionCount}: ${JSON.stringify(Array.from(placedTents))}`);
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

const data = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/tents/easy/easy-0001.json', 'utf8'));
console.log('网格:');
data.grid.forEach((row, i) => console.log(`${i}: ${JSON.stringify(row)}`));
console.log(`\n树的标注: ${JSON.stringify(data.tents)}`);
console.log(`\n求解中...`);

const count = countSolutions(data.grid, data.size, 10);
console.log(`\n解的数量: ${count}`);
