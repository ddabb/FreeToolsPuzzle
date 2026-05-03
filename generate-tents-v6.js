/**
 * 帐篷 (Tents) 快速唯一解生成器 v6
 * 策略：快速生成 + 快速验证 + 重试
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const DIFFICULTIES = {
  // easy: { size: 6, count: 1000, minTrees: 4, maxTrees: 6 },
  // medium: { size: 8, count: 1000, minTrees: 6, maxTrees: 9 },
  hard: { size: 10, count: 1000, minTrees: 5, maxTrees: 8 }
};

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

// 快速计算解数量（最多检查到2个）
function hasUniqueSolution(puzzleGrid, size) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return { unique: false, count: 0 };
  
  let solutionCount = 0;
  let solution = null;
  
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );
  
  if (tentPlacements.some(p => p.length === 0)) return { unique: false, count: 0 };
  
  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= 2) return; // 找到2个解就停止
    if (treeIndex === trees.length) { 
      solutionCount++; 
      if (!solution) solution = new Set(placedTents);
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
      if (solutionCount >= 2) return;
    }
  }
  
  backtrack(0, new Set());
  return { unique: solutionCount === 1, count: solutionCount, solution };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 快速生成一个合法的树+帐篷布局
function quickGenerate(size, minTrees, maxTrees) {
  const fullGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const tentPositions = new Set();
  const treePositions = [];
  
  const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));
  
  let tries = 0;
  const maxTries = size * size * 5;
  
  while (treePositions.length < targetTrees && tries < maxTries) {
    tries++;
    
    const tr = Math.floor(Math.random() * size);
    const tc = Math.floor(Math.random() * size);
    
    if (fullGrid[tr][tc] !== CELL_EMPTY) continue;
    
    const tentNeighbors = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
      if (fullGrid[nr][nc] !== CELL_EMPTY) return false;
      for (const [ar, ac] of getNeighbors(nr, nc, size)) {
        if (tentPositions.has(`${ar},${ac}`)) return false;
      }
      return true;
    });
    
    if (tentNeighbors.length === 0) continue;
    
    shuffle(tentNeighbors);
    const [tenr, tenc] = tentNeighbors[0];
    
    fullGrid[tr][tc] = CELL_TREE;
    fullGrid[tenr][tenc] = CELL_TENT;
    tentPositions.add(`${tenr},${tenc}`);
    treePositions.push([tr, tc]);
  }
  
  if (treePositions.length < minTrees) return null;
  
  // 创建题目网格（只有树）
  const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  for (const [tr, tc] of treePositions) {
    puzzleGrid[tr][tc] = CELL_TREE;
  }
  
  return { puzzleGrid, tentPositions, treeCount: treePositions.length };
}

function generatePuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = quickGenerate(size, minTrees, maxTrees);
    if (!result) continue;
    
    const { puzzleGrid, tentPositions, treeCount } = result;
    const check = hasUniqueSolution(puzzleGrid, size);
    
    if (check.unique) {
      const tents = {};
      for (const pos of check.solution) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount };
    }
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成帐篷唯一解题目 v6 (快速生成+验证)...\n');
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);
    
    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);
    console.log(`  树数范围: ${config.minTrees}-${config.maxTrees}`);
    
    let success = 0;
    let fail = 0;
    const startTime = Date.now();
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generatePuzzle(config.size, config.minTrees, config.maxTrees);
      
      if (puzzle) {
        const fileId = String(i).padStart(4, '0');
        const filename = `${difficulty}-${fileId}.json`;
        const filepath = path.join(difficultyDir, filename);
        
        const data = {
          id: i,
          difficulty: difficulty,
          size: config.size,
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
      
      if (i % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${i}/${config.count} (${elapsed}s, 成功: ${success}, 失败: ${fail})`);
      }
    }
    
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  完成! 成功: ${success}, 失败: ${fail}, 耗时: ${time}s\n`);
    total += success;
  }
  
  console.log(`总计生成 ${total} 道唯一解题目`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

generateAll();
