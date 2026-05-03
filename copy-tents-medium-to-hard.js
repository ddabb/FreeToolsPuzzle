/**
 * 帐篷 (Tents) v9 - 从 Medium 扩展
 * 思路：取一个 Medium (8×8) 唯一解题，在边缘添加树+帐篷
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');

function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([nr, nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size);
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 从 Medium 题目扩展到 Hard
function expandFromMedium(mediumPuzzle) {
  const mediumSize = 8;
  const hardSize = 10;
  
  // 创建 10×10 网格，将 8×8 放在中心
  const hardGrid = Array(hardSize).fill(null).map(() => Array(hardSize).fill(CELL_EMPTY));
  
  const offsetR = 1;
  const offsetC = 1;
  
  // 复制 Medium 的树
  const trees = [];
  for (let r = 0; r < mediumSize; r++) {
    for (let c = 0; c < mediumSize; c++) {
      if (mediumPuzzle.grid[r][c] === CELL_TREE) {
        hardGrid[r + offsetR][c + offsetC] = CELL_TREE;
        trees.push([r + offsetR, c + offsetC]);
      }
    }
  }
  
  // 在边缘添加新的树+帐篷
  const edgePositions = [];
  for (let r = 0; r < hardSize; r++) {
    for (let c = 0; c < hardSize; c++) {
      if (hardGrid[r][c] === CELL_EMPTY) {
        // 边缘位置（不在中心 8×8 区域）
        if (r < offsetR || r >= offsetR + mediumSize || c < offsetC || c >= offsetC + mediumSize) {
          edgePositions.push([r, c]);
        }
      }
    }
  }
  
  shuffle(edgePositions);
  const tents = new Set();
  
  // 不添加新树，直接检查唯一解
  const result = countSolutions(hardGrid, hardSize, 2);
  
  if (result.count === 1) {
    const tentsObj = {};
    for (const pos of result.solution) {
      tentsObj[pos] = true;
    }
    return { grid: hardGrid, tents: tentsObj, treeCount: trees.length };
  }
  
  // 如果多解，尝试添加 0-1 对树+帐篷
  for (let attempt = 0; attempt < 3; attempt++) {
    const testGrid = hardGrid.map(row => [...row]);
    const testTrees = [...trees];
    const testTents = new Set();
    
    shuffle(edgePositions);
    let added = 0;
    
    for (const [tr, tc] of edgePositions) {
      if (added >= 1) break;
    if (hardGrid[tr][tc] !== CELL_EMPTY) continue;
    
    const tentSpots = getNeighbors(tr, tc, hardSize).filter(([nr, nc]) => {
      if (hardGrid[nr][nc] !== CELL_EMPTY) return false;
      for (const [tr2, tc2] of getNeighbors(nr, nc, hardSize)) {
        if (tents.has(`${tr2},${tc2}`)) return false;
      }
      return true;
    });
    
    if (tentSpots.length === 0) continue;
    
    shuffle(tentSpots);
    const [tenr, tenc] = tentSpots[0];
    
    hardGrid[tr][tc] = CELL_TREE;
    trees.push([tr, tc]);
    tents.add(`${tenr},${tenc}`);
    added++;
  }
  
  // 检查唯一解
  const result = countSolutions(hardGrid, hardSize, 2);
  
  if (result.count === 1) {
    const tentsObj = {};
    for (const pos of result.solution) {
      tentsObj[pos] = true;
    }
    return { grid: hardGrid, tents: tentsObj, treeCount: trees.length };
  }
  
  return null;
}

function main() {
  console.log('帐篷 v9 - 从 Medium 扩展\n');
  
  // 加载 Medium 题目
  const mediumDir = path.join(OUTPUT_DIR, 'medium');
  const mediumFiles = fs.readdirSync(mediumDir).filter(f => f.endsWith('.json'));
  
  console.log(`加载 ${mediumFiles.length} 个 Medium 题目\n`);
  
  // 找出 Hard 多解文件
  const hardDir = path.join(OUTPUT_DIR, 'hard');
  const hardFiles = fs.readdirSync(hardDir).filter(f => f.endsWith('.json'));
  const multiFiles = [];
  
  for (const file of hardFiles) {
    const filepath = path.join(hardDir, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const result = countSolutions(data.grid, 10, 2);
    if (result.count > 1) {
      multiFiles.push({ file, filepath, id: data.id });
    }
  }
  
  console.log(`发现 ${multiFiles.length} 个 Hard 多解文件\n`);
  
  if (multiFiles.length === 0) {
    console.log('全部 Hard 题目已是唯一解！');
    return;
  }
  
  let success = 0;
  let fail = 0;
  const startTime = Date.now();
  
  // 用 Medium 题目替换 Hard 多解文件
  for (let i = 0; i < Math.min(multiFiles.length, mediumFiles.length); i++) {
    const { file, filepath, id } = multiFiles[i];
    const mediumPath = path.join(mediumDir, mediumFiles[i]);
    const mediumData = JSON.parse(fs.readFileSync(mediumPath, 'utf8'));
    
    const puzzle = expandFromMedium(mediumData);
    
    if (puzzle) {
      const data = {
        id: id,
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
    } else {
      fail++;
    }
  }
  
  const time = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成! 成功: ${success}, 失败: ${fail}, 耗时: ${time}s`);
}

main();
