/**
 * 帐篷 (Tents) 唯一解生成器 v3 - 生产版
 * 每难度 1000 题，共 3000 题
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minTrees: 3, maxTrees: 5 },
  medium: { size: 8, count: 1000, minTrees: 4, maxTrees: 6 },
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

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateCompactPuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));
    
    const tentPositions = new Set();
    const treePositions = [];
    
    let success = true;
    
    for (let i = 0; i < targetTrees; i++) {
      let placed = false;
      
      const candidates = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === CELL_EMPTY) {
            candidates.push([r, c]);
          }
        }
      }
      shuffle(candidates);
      
      // 优先选择只有唯一帐篷位置的树位置
      const singleOptionTrees = [];
      const multiOptionTrees = [];
      
      for (const [tr, tc] of candidates) {
        const tentNeighbors = getNeighbors(tr, tc, size).filter(([nr, nc]) => {
          if (grid[nr][nc] !== CELL_EMPTY) return false;
          for (const [ar, ac] of getNeighbors(nr, nc, size)) {
            if (tentPositions.has(`${ar},${ac}`)) return false;
          }
          return true;
        });
        
        if (tentNeighbors.length === 1) {
          singleOptionTrees.push([tr, tc, tentNeighbors[0]]);
        } else if (tentNeighbors.length > 1) {
          multiOptionTrees.push([tr, tc, tentNeighbors]);
        }
      }
      
      // 优先使用单选项位置
      if (singleOptionTrees.length > 0) {
        shuffle(singleOptionTrees);
        const [tr, tc, [nr, nc]] = singleOptionTrees[0];
        grid[tr][tc] = CELL_TREE;
        grid[nr][nc] = CELL_TENT;
        tentPositions.add(`${nr},${nc}`);
        treePositions.push([tr, tc]);
        placed = true;
      } else if (multiOptionTrees.length > 0) {
        shuffle(multiOptionTrees);
        const [tr, tc, neighbors] = multiOptionTrees[0];
        shuffle(neighbors);
        const [nr, nc] = neighbors[0];
        grid[tr][tc] = CELL_TREE;
        grid[nr][nc] = CELL_TENT;
        tentPositions.add(`${nr},${nc}`);
        treePositions.push([tr, tc]);
        placed = true;
      }
      
      if (!placed && i >= minTrees) {
        break;
      } else if (!placed && i < minTrees) {
        success = false;
        break;
      }
    }
    
    if (!success || treePositions.length < minTrees) continue;
    
    // 创建题目网格
    const puzzleGrid = createEmptyGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) {
          puzzleGrid[r][c] = CELL_TREE;
        }
      }
    }
    
    // 验证唯一解
    const solCount = countSolutions(puzzleGrid, size, 2);
    
    if (solCount === 1) {
      const tents = {};
      for (const pos of tentPositions) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount: treePositions.length };
    }
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成帐篷唯一解题目 v3...\n');
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);
    
    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);
    
    let success = 0;
    let fail = 0;
    const startTime = Date.now();
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generateCompactPuzzle(config.size, config.minTrees, config.maxTrees);
      
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
        console.log(`  ${i}/${config.count} (${elapsed}s, 成功: ${success})`);
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
