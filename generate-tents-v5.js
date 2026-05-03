/**
 * 帐篷 (Tents) 唯一解生成器 v5
 * 策略：补树补帐篷逼近唯一解（修复版）
 * 
 * 关键修复：验证的是"题目网格"（只有树），不是完整网格（树+帐篷）
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const DIFFICULTIES = {
  // easy: { size: 6, count: 1000, initialTrees: 2, maxTrees: 8 },
  // medium: { size: 8, count: 1000, initialTrees: 3, maxTrees: 10 },
  hard: { size: 10, count: 1000, initialTrees: 5, maxTrees: 12 }
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

// 检查帐篷位置是否合法（不与其他帐篷相邻）
function isValidTentPosition(grid, r, c, size, existingTents) {
  if (grid[r][c] !== CELL_EMPTY) return false;
  
  // 检查是否与其他帐篷相邻
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (existingTents.has(`${nr},${nc}`)) return false;
  }
  return true;
}

// 计算题目网格的解数量
function countSolutions(puzzleGrid, size, maxCount = 100) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return 0;
  
  let solutionCount = 0;
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
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

// 找出一个解（用于确定答案）
function findOneSolution(puzzleGrid, size) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return null;
  
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );
  
  if (tentPlacements.some(p => p.length === 0)) return null;
  
  function backtrack(treeIndex, placedTents) {
    if (treeIndex === trees.length) {
      return new Set(placedTents);
    }
    
    for (const [tr, tc] of tentPlacements[treeIndex]) {
      if (placedTents.has(`${tr},${tc}`)) continue;
      let adjacent = false;
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (placedTents.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;
      placedTents.add(`${tr},${tc}`);
      const result = backtrack(treeIndex + 1, placedTents);
      if (result) return result;
      placedTents.delete(`${tr},${tc}`);
    }
    
    return null;
  }
  
  return backtrack(0, new Set());
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generatePuzzle(size, initialTrees, maxTrees) {
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 完整网格（包含树和帐篷）
    const fullGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    const tentPositions = new Set();
    const treePositions = [];
    
    // 阶段1：随机放置初始树和帐篷
    let placed = 0;
    let tries = 0;
    const maxTries = size * size * 10;
    
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
    
    if (placed < initialTrees) continue;
    
    // 创建题目网格（只有树）
    const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    for (const [tr, tc] of treePositions) {
      puzzleGrid[tr][tc] = CELL_TREE;
    }
    
    // 阶段2：检查题目网格的解数量
    let solutionCount = countSolutions(puzzleGrid, size, 100);
    
    if (solutionCount === 0) continue;
    if (solutionCount === 1) {
      // 直接唯一解！
      const tents = {};
      for (const pos of tentPositions) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount: treePositions.length };
    }
    
    // 阶段3：逐步添加树+帐篷来约束
    let iterations = 0;
    const maxIterations = 30;
    
    while (solutionCount > 1 && iterations < maxIterations && treePositions.length < maxTrees) {
      iterations++;
      
      // 找一个新位置添加树+帐篷
      const candidates = [];
      
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (fullGrid[r][c] === CELL_EMPTY) {
            // 检查是否可以放树
            const tentOptions = getNeighbors(r, c, size).filter(([nr, nc]) => 
              isValidTentPosition(fullGrid, nr, nc, size, tentPositions)
            );
            
            if (tentOptions.length > 0) {
              candidates.push({ treePos: [r, c], tentOptions });
            }
          }
        }
      }
      
      if (candidates.length === 0) break;
      
      shuffle(candidates);
      let added = false;
      
      for (const cand of candidates) {
        const [tr, tc] = cand.treePos;
        shuffle(cand.tentOptions);
        
        for (const [tenr, tenc] of cand.tentOptions) {
          // 尝试添加
          fullGrid[tr][tc] = CELL_TREE;
          fullGrid[tenr][tenc] = CELL_TENT;
          tentPositions.add(`${tenr},${tenc}`);
          treePositions.push([tr, tc]);
          
          // 创建新的题目网格
          const newPuzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
          for (const [tr2, tc2] of treePositions) {
            newPuzzleGrid[tr2][tc2] = CELL_TREE;
          }
          
          // 验证题目网格
          const newCount = countSolutions(newPuzzleGrid, size, 100);
          
          if (newCount === 1) {
            // 成功！
            const tents = {};
            for (const pos of tentPositions) {
              tents[pos] = true;
            }
            return { grid: newPuzzleGrid, tents, treeCount: treePositions.length };
          } else if (newCount > 0 && newCount < solutionCount) {
            // 有进步，继续
            solutionCount = newCount;
            added = true;
            break;
          } else {
            // 无效或没改善，回退
            fullGrid[tr][tc] = CELL_EMPTY;
            fullGrid[tenr][tenc] = CELL_EMPTY;
            tentPositions.delete(`${tenr},${tenc}`);
            treePositions.pop();
          }
        }
        
        if (added) break;
      }
      
      if (!added) break;
    }
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成帐篷唯一解题目 v5 (补树补帐篷策略)...\n');
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);
    
    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);
    console.log(`  初始树数: ${config.initialTrees}, 最大树数: ${config.maxTrees}`);
    
    let success = 0;
    let fail = 0;
    const startTime = Date.now();
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generatePuzzle(config.size, config.initialTrees, config.maxTrees);
      
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
