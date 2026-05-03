// 找出多解的题目
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

const dir = 'F:/SelfJob/FreeToolsPuzzle/data/tents/hard';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

console.log(`检查 ${files.length} 个文件...`);

let unique = 0, multiple = 0;
const multiFiles = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const count = countSolutions(data.grid, data.size, 3);
  if (count === 1) unique++;
  else if (count > 1) {
    multiple++;
    multiFiles.push({ file, count });
  }
}

console.log(`\n唯一解: ${unique}, 多解: ${multiple}`);

if (multiFiles.length > 0 && multiFiles.length <= 20) {
  console.log('\n多解文件列表:');
  multiFiles.forEach(f => console.log(`  ${f.file}: ${f.count}解`));
}
