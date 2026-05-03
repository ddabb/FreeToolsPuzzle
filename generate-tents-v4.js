/**
 * 帐篷 (Tents) 唯一解生成器 v4
 * 策略：补树补帐篷逼近唯一解
 * 
 * 思路：
 * 1. 先随机放置一些树和对应的帐篷（保证合法）
 * 2. 检查解的数量
 * 3. 如果多解，添加新的树+帐篷组合来约束
 * 4. 重复直到唯一解或无法继续
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, initialTrees: 2, maxTrees: 6 },
  medium: { size: 8, count: 1000, initialTrees: 3, maxTrees: 8 },
  hard: { size: 10, count: 1000, initialTrees: 4, maxTrees: 12 }
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

function getDiagonals(r, c, size) {
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
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

// 找出所有可能的解
function findAllSolutions(grid, size, maxSolutions = 100) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return [];
  
  const solutions = [];
  const tentPlacements = trees.map(([tr, tc]) => 
    getNeighbors(tr, tc, size).filter(([nr, nc]) => grid[nr][nc] === CELL_EMPTY)
  );
  
  // 如果有树没有可放帐篷的位置，无解
  if (tentPlacements.some(p => p.length === 0)) return [];
  
  function backtrack(treeIndex, placedTents, assignment) {
    if (solutions.length >= maxSolutions) return;
    if (treeIndex === trees.length) {
      solutions.push(new Map(assignment));
      return;
    }
    
    for (const [tr, tc] of tentPlacements[treeIndex]) {
      const key = `${tr},${tc}`;
      if (placedTents.has(key)) continue;
      
      // 检查是否与其他已放帐篷相邻
      let adjacent = false;
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (placedTents.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;
      
      placedTents.add(key);
      assignment.set(treeIndex, [tr, tc]);
      backtrack(treeIndex + 1, placedTents, assignment);
      placedTents.delete(key);
      assignment.delete(treeIndex);
      
      if (solutions.length >= maxSolutions) return;
    }
  }
  
  backtrack(0, new Set(), new Map());
  return solutions;
}

// 找出所有解的差异点（用于确定添加约束的位置）
function findDifferences(solutions, trees, size) {
  if (solutions.length < 2) return [];
  
  const differences = [];
  
  // 对于每棵树，检查不同解中帐篷位置的差异
  for (let t = 0; t < trees.length; t++) {
    const positions = new Set();
    for (const sol of solutions) {
      const [tr, tc] = sol.get(t) || [-1, -1];
      positions.add(`${tr},${tc}`);
    }
    
    if (positions.size > 1) {
      differences.push({
        treeIndex: t,
        treePos: trees[t],
        positions: Array.from(positions).map(p => p.split(',').map(Number))
      });
    }
  }
  
  return differences;
}

// 尝试添加新的树+帐篷来约束多解
function tryAddConstraint(grid, size, existingTents, solutions, maxTrees) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  
  if (trees.length >= maxTrees) return null;
  
  // 找出解差异最大的位置
  const differences = findDifferences(solutions, trees, size);
  
  // 尝试在差异位置附近添加新树
  const candidates = [];
  
  for (const diff of differences) {
    for (const [tr, tc] of diff.positions) {
      // 在这个帐篷位置旁边找空位放新树
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (grid[nr][nc] === CELL_EMPTY) {
          // 检查这个位置是否可以放树
          // 找这个新树对应的合法帐篷位置
          const tentOptions = getNeighbors(nr, nc, size).filter(([tr, tc]) => 
            isValidTentPosition(grid, tr, tc, size, existingTents)
          );
          
          if (tentOptions.length > 0) {
            candidates.push({
              treePos: [nr, nc],
              tentOptions: tentOptions
            });
          }
        }
      }
    }
  }
  
  // 随机选择一个候选
  shuffle(candidates);
  
  for (const cand of candidates) {
    const [tr, tc] = cand.treePos;
    shuffle(cand.tentOptions);
    
    for (const [tenr, tenc] of cand.tentOptions) {
      // 尝试添加这组树+帐篷
      grid[tr][tc] = CELL_TREE;
      grid[tenr][tenc] = CELL_TENT;
      existingTents.add(`${tenr},${tenc}`);
      
      // 检查是否减少了解的数量
      const newSolutions = findAllSolutions(grid, size, 10);
      
      if (newSolutions.length === 1) {
        return { success: true, unique: true };
      } else if (newSolutions.length < solutions.length) {
        return { success: true, unique: false };
      }
      
      // 回退
      grid[tr][tc] = CELL_EMPTY;
      grid[tenr][tenc] = CELL_EMPTY;
      existingTents.delete(`${tenr},${tenc}`);
    }
  }
  
  return null;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generatePuzzle(size, initialTrees, maxTrees) {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    const tentPositions = new Set();
    const treePositions = [];
    
    // 阶段1：随机放置初始树和帐篷
    let placed = 0;
    let tries = 0;
    const maxTries = size * size * 10;
    
    while (placed < initialTrees && tries < maxTries) {
      tries++;
      
      // 随机选择树的位置
      const tr = Math.floor(Math.random() * size);
      const tc = Math.floor(Math.random() * size);
      
      if (grid[tr][tc] !== CELL_EMPTY) continue;
      
      // 找合法的帐篷位置
      const tentNeighbors = getNeighbors(tr, tc, size).filter(([nr, nc]) => 
        isValidTentPosition(grid, nr, nc, size, tentPositions)
      );
      
      if (tentNeighbors.length === 0) continue;
      
      shuffle(tentNeighbors);
      const [tenr, tenc] = tentNeighbors[0];
      
      grid[tr][tc] = CELL_TREE;
      grid[tenr][tenc] = CELL_TENT;
      tentPositions.add(`${tenr},${tenc}`);
      treePositions.push([tr, tc]);
      placed++;
    }
    
    if (placed < initialTrees) continue;
    
    // 阶段2：检查解的数量，逐步添加约束
    let solutions = findAllSolutions(grid, size, 100);
    
    if (solutions.length === 0) continue;
    
    let iterations = 0;
    const maxIterations = 50;
    
    while (solutions.length > 1 && iterations < maxIterations) {
      iterations++;
      
      const result = tryAddConstraint(grid, size, tentPositions, solutions, maxTrees);
      
      if (!result) break;
      
      if (result.unique) {
        // 找到唯一解！
        const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (grid[r][c] === CELL_TREE) {
              puzzleGrid[r][c] = CELL_TREE;
            }
          }
        }
        
        const tents = {};
        for (const pos of tentPositions) {
          tents[pos] = true;
        }
        
        return { grid: puzzleGrid, tents, treeCount: treePositions.length + 1 };
      }
      
      // 继续约束
      solutions = findAllSolutions(grid, size, 100);
    }
    
    // 如果迭代后只剩一个解
    if (solutions.length === 1) {
      const puzzleGrid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === CELL_TREE) {
            puzzleGrid[r][c] = CELL_TREE;
          }
        }
      }
      
      const tents = {};
      for (const pos of tentPositions) {
        tents[pos] = true;
      }
      
      return { grid: puzzleGrid, tents, treeCount: Array.from(tentPositions).length };
    }
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成帐篷唯一解题目 v4 (补树补帐篷策略)...\n');
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
