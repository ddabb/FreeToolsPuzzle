/**
 * 帐篷 (Tents) 增量生成器 - 只生成多解题目的替代
 * 每次运行 50 题，避免超时
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
  let oneSolution = null;
  
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );
  
  if (tentPlacements.some(p => p.length === 0)) return 0;
  
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

function generateOne(size, initialTrees, maxTrees, maxIterations) {
  const fullGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const tentPositions = new Set();
  const treePositions = [];
  
  // 阶段1：放置初始树+帐篷
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
  
  if (placed < initialTrees) return null;
  
  // 阶段2：迭代添加约束
  for (let iter = 0; iter < maxIterations && treePositions.length < maxTrees; iter++) {
    const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    for (const [tr, tc] of treePositions) {
      puzzleGrid[tr][tc] = CELL_TREE;
    }
    
    const result = countSolutions(puzzleGrid, size, 2);
    
    if (result.count === 1) {
      const tents = {};
      for (const pos of result.solution) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount: treePositions.length };
    }
    
    if (result.count === 0) return null;
    
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
    
    if (candidates.length === 0) return null;
    
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
  
  return null;
}

// 找出所有多解文件
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
  console.log('帐篷增量生成器 - 只替换多解题\n');
  
  // 找出多解文件
  const multiFiles = findMultiSolutionFiles();
  console.log(`发现 ${multiFiles.length} 个多解文件\n`);
  
  if (multiFiles.length === 0) {
    console.log('全部题目已是唯一解！');
    return;
  }
  
  // 每次只处理 50 个
  const batchSize = 50;
  const toProcess = multiFiles.slice(0, batchSize);
  
  console.log(`本次处理 ${toProcess.length} 个文件...\n`);
  
  let success = 0;
  let fail = 0;
  const startTime = Date.now();
  
  for (const { file, filepath, id } of toProcess) {
    const puzzle = generateOne(10, 5, 12, 15);
    
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
  console.log(`剩余多解文件: ${multiFiles.length - success}`);
}

main();
