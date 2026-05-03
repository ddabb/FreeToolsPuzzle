/**
 * 帐篷 (Tents) 唯一解生成器 v5-optimized
 * 优化：减少迭代，增加并行尝试
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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

// 尝试生成一个唯一解题（带约束迭代）
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
    // 创建题目网格
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
    
    if (result.count === 0) return null; // 无解，放弃
    
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

function generateHard() {
  console.log('生成 hard (10x10, 目标1000题)...\n');
  
  const difficultyDir = path.join(OUTPUT_DIR, 'hard');
  ensureDir(difficultyDir);
  
  const size = 10;
  const target = 1000;
  
  let success = 0;
  let fail = 0;
  const startTime = Date.now();
  
  for (let i = 1; i <= target; i++) {
    const fileId = String(i).padStart(4, '0');
    const filename = `hard-${fileId}.json`;
    const filepath = path.join(difficultyDir, filename);
    
    // 如果文件已存在且唯一解，跳过
    if (fs.existsSync(filepath)) {
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      const result = countSolutions(data.grid, size, 2);
      if (result.count === 1) {
        success++;
        continue;
      }
    }
    
    // 生成新题
    const puzzle = generateOne(size, 5, 12, 20);
    
    if (puzzle) {
      const data = {
        id: i,
        difficulty: 'hard',
        size: size,
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
    
    if (i % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${i}/${target} (${elapsed}s, 成功: ${success}, 失败: ${fail})`);
    }
  }
  
  const time = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n完成! 成功: ${success}, 失败: ${fail}, 耗时: ${time}s`);
}

generateHard();
