// 检查现有帐篷题库的唯一解比例
const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
}

function countSolutions(grid, size, maxCount = 3) {
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

const DIFFICULTIES = ['easy', 'medium', 'hard'];

for (const diff of DIFFICULTIES) {
  const dir = path.join(__dirname, 'data', 'tents', diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(0, 100);
  
  let unique = 0, multiple = 0, nosolution = 0;
  const startTime = Date.now();
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const count = countSolutions(data.grid, data.size, 3);
    if (count === 0) nosolution++;
    else if (count === 1) unique++;
    else multiple++;
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`${diff}: 唯一解=${unique}, 多解=${multiple}, 无解=${nosolution} (检查${files.length}题, ${elapsed}s)`);
}
