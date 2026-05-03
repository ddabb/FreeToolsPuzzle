/**
 * 帐篷 (Tents) 唯一解生成器 v7 - 反向策略
 * 思路：先生成一个完整解（树+帐篷），再尝试移除帐篷，保留唯一解
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
  if (trees.length === 0) return 0;
  
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

// 生成一个有唯一解的题目
function generateOne(size, minTrees, maxTrees) {
  // 从空网格开始
  const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const trees = [];
  const tents = new Set();
  
  // 随机放置树+帐篷对，确保约束有效
  const maxAttempts = size * size * 10;
  let attempts = 0;
  
  while (trees.length < maxTrees && attempts < maxAttempts) {
    attempts++;
    const tr = Math.floor(Math.random() * size);
    const tc = Math.floor(Math.random() * size);
    
    if (grid[tr][tc] !== CELL_EMPTY) continue;
    
    // 找可用的帐篷位置
    const tentSpots = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
      if (grid[nr][nc] !== CELL_EMPTY) return false;
      // 检查是否与现有帐篷相邻
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
  
  if (trees.length < minTrees) return null;
  
  // 创建题目网格（只有树）
  const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  for (const [tr, tc] of trees) {
    puzzleGrid[tr][tc] = CELL_TREE;
  }
  
  // 检查唯一解
  const result = countSolutions(puzzleGrid, size, 2);
  
  if (result.count === 1) {
    const tentsObj = {};
    for (const pos of result.solution) {
      tentsObj[pos] = true;
    }
    return { grid: puzzleGrid, tents: tentsObj, treeCount: trees.length };
  }
  
  return null;
}

// 找出多解文件
function findMultiSolutionFiles() {
  const dir = path.join(OUTPUT_DIR, 'hard');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const multiFiles = [];
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const result = countSolutions(data.grid, 10, 2);
    if (result.count > 1) {
      multiFiles.push({ file, filepath, id: data.id });
    }
  }
  
  return multiFiles;
}

function main() {
  console.log('帐篷 v7 生成器 - 完整解验证\n');
  
  // 找出多解文件
  const multiFiles = findMultiSolutionFiles();
  console.log(`发现 ${multiFiles.length} 个多解文件\n`);
  
  if (multiFiles.length === 0) {
    console.log('全部题目已是唯一解！');
    return;
  }
  
  let success = 0;
  let fail = 0;
  const startTime = Date.now();
  const toProcess = multiFiles.slice(0, 50); // 每次处理 50 个
  
  console.log(`处理 ${toProcess.length} 个文件...\n`);
  
  for (const { file, filepath, id } of toProcess) {
    const puzzle = generateOne(10, 5, 10); // 5-10 棵树
    
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
