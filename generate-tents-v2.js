/**
 * 帐篷 (Tents) 唯一解生成器 v2
 * 策略：补树补帐篷逼近唯一解
 * 
 * 规则：
 * 1. 每棵树必须有且仅有1个帐篷紧邻（上下左右）
 * 2. 帐篷之间不能水平或垂直相邻
 * 3. 每个帐篷只能对应1棵树
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minTrees: 5, maxTrees: 7 },
  medium: { size: 8, count: 1000, minTrees: 8, maxTrees: 11 },
  hard: { size: 10, count: 1000, minTrees: 12, maxTrees: 16 }
};

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');
const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_TENT = 2;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 创建空网格
function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

// 深拷贝网格
function cloneGrid(grid) {
  return grid.map(row => [...row]);
}

// 检查位置是否在网格内
function inBounds(r, c, size) {
  return r >= 0 && r < size && c >= 0 && c < size;
}

// 获取相邻位置
function getNeighbors(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const neighbors = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc, size)) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

// 检查帐篷是否可以放置（不与其他帐篷相邻）
function canPlaceTent(grid, r, c, size) {
  if (grid[r][c] !== CELL_EMPTY) return false;
  
  // 检查四个方向是否有其他帐篷
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (grid[nr][nc] === CELL_TENT) return false;
  }
  return true;
}

// 检查帐篷是否与树相邻
function hasAdjacentTree(grid, r, c, size) {
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (grid[nr][nc] === CELL_TREE) return true;
  }
  return false;
}

// 唯一解求解器 - 返回解的数量（最多检测到2个就停止）
function countSolutions(grid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_TREE) {
        trees.push([r, c]);
      }
    }
  }
  
  if (trees.length === 0) return 0;
  
  let solutionCount = 0;
  const tentPlacements = trees.map(() => []); // 每棵树的可能帐篷位置
  
  // 预计算每棵树的可能帐篷位置
  for (let i = 0; i < trees.length; i++) {
    const [tr, tc] = trees[i];
    for (const [nr, nc] of getNeighbors(tr, tc, size)) {
      if (grid[nr][nc] === CELL_EMPTY) {
        tentPlacements[i].push([nr, nc]);
      }
    }
  }
  
  // 如果某棵树没有可行帐篷位置，无解
  for (const placements of tentPlacements) {
    if (placements.length === 0) return 0;
  }
  
  // 回溯搜索
  function backtrack(treeIndex, currentGrid, placedTents) {
    if (solutionCount >= maxCount) return;
    
    if (treeIndex === trees.length) {
      solutionCount++;
      return;
    }
    
    for (const [tr, tc] of tentPlacements[treeIndex]) {
      // 检查是否已被其他帐篷占用
      if (placedTents.has(`${tr},${tc}`)) continue;
      
      // 检查是否会与现有帐篷相邻
      let adjacent = false;
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (placedTents.has(`${nr},${nc}`)) {
          adjacent = true;
          break;
        }
      }
      if (adjacent) continue;
      
      // 放置帐篷
      placedTents.add(`${tr},${tc}`);
      backtrack(treeIndex + 1, currentGrid, placedTents);
      placedTents.delete(`${tr},${tc}`);
      
      if (solutionCount >= maxCount) return;
    }
  }
  
  backtrack(0, grid, new Set());
  return solutionCount;
}

// 生成唯一解题目
function generateUniquePuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 500;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 第一步：生成一个完整的解（树+帐篷布局）
    const grid = createEmptyGrid(size);
    const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));
    
    // 随机放置树
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    shuffle(cells);
    
    const treePositions = [];
    for (let i = 0; i < Math.min(targetTrees, cells.length); i++) {
      const [r, c] = cells[i];
      grid[r][c] = CELL_TREE;
      treePositions.push([r, c]);
    }
    
    // 第二步：为每棵树尝试分配帐篷
    const tentPositions = new Set();
    let valid = true;
    
    shuffle(treePositions);
    for (const [tr, tc] of treePositions) {
      const neighbors = getNeighbors(tr, tc, size);
      shuffle(neighbors);
      
      let placed = false;
      for (const [nr, nc] of neighbors) {
        if (grid[nr][nc] === CELL_EMPTY) {
          // 检查是否与其他帐篷相邻
          let adjacentTent = false;
          for (const [ar, ac] of getNeighbors(nr, nc, size)) {
            if (tentPositions.has(`${ar},${ac}`)) {
              adjacentTent = true;
              break;
            }
          }
          
          if (!adjacentTent) {
            grid[nr][nc] = CELL_TENT;
            tentPositions.add(`${nr},${nc}`);
            placed = true;
            break;
          }
        }
      }
      
      if (!placed) {
        valid = false;
        break;
      }
    }
    
    if (!valid) continue;
    
    // 第三步：验证唯一解
    // 创建题目网格（只保留树，移除帐篷标记）
    const puzzleGrid = createEmptyGrid(size);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) {
          puzzleGrid[r][c] = CELL_TREE;
        }
      }
    }
    
    const solCount = countSolutions(puzzleGrid, size, 2);
    
    if (solCount === 1) {
      // 成功！构建输出数据
      const tents = {};
      for (const pos of tentPositions) {
        tents[pos] = true;
      }
      return { grid: puzzleGrid, tents, treeCount: treePositions.length };
    }
    
    // 如果有多解，尝试增加树来约束
    if (solCount > 1) {
      // 尝试在空位添加树
      const emptyCells = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (puzzleGrid[r][c] === CELL_EMPTY) {
            emptyCells.push([r, c]);
          }
        }
      }
      shuffle(emptyCells);
      
      for (const [er, ec] of emptyCells.slice(0, 10)) {
        const testGrid = cloneGrid(puzzleGrid);
        testGrid[er][ec] = CELL_TREE;
        
        const testCount = countSolutions(testGrid, size, 2);
        if (testCount === 1) {
          // 找到唯一解配置，计算对应的帐篷
          const tents = {};
          for (const pos of tentPositions) {
            tents[pos] = true;
          }
          return { grid: testGrid, tents, treeCount: treePositions.length + 1 };
        }
      }
    }
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成帐篷题目（唯一解版本）...\n');
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  let uniqueCount = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);
    
    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);
    
    let success = 0;
    let fail = 0;
    const startTime = Date.now();
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generateUniquePuzzle(config.size, config.minTrees, config.maxTrees);
      
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
        uniqueCount++;
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
