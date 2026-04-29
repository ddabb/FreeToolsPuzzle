#!/usr/bin/env node
/**
 * Akari (Light Up) Puzzle Generator
 * 
 * 生成带唯一解的Akari谜题，包含answer字段
 * 
 * 算法思路：
 * 1. 随机放置灯塔作为解
 * 2. 根据解放置墙壁（包括数字墙壁）
 * 3. 验证唯一性
 * 4. 输出谜题和答案
 */

const fs = require('fs');
const path = require('path');

// 方向向量
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * 回溯求解器 - 寻找所有解（用于验证唯一性）
 */
function solveAkari(grid, maxSolutions = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 解析网格：-1=墙无数字, 0-4=墙带数字, 空格=' '
  const walls = grid.map(row => row.map(cell => {
    if (typeof cell === 'number') return cell; // 数字墙或-1
    if (cell === '#' || cell === 'X') return -1; // 普通墙
    return -2; // 白格
  }));
  
  const solutions = [];
  let lights = Array(rows).fill(null).map(() => Array(cols).fill(false));
  let lit = Array(rows).fill(null).map(() => Array(cols).fill(false));
  
  function canPlaceLight(r, c) {
    if (walls[r][c] !== -2) return false;
    if (lights[r][c]) return false;
    if (lit[r][c]) return false;
    
    // 检查同行同列是否已有灯（会被照到）
    // 向上
    for (let i = r - 1; i >= 0; i--) {
      if (walls[i][c] !== -2) break;
      if (lights[i][c]) return false;
    }
    // 向下
    for (let i = r + 1; i < rows; i++) {
      if (walls[i][c] !== -2) break;
      if (lights[i][c]) return false;
    }
    // 向左
    for (let j = c - 1; j >= 0; j--) {
      if (walls[r][j] !== -2) break;
      if (lights[r][j]) return false;
    }
    // 向右
    for (let j = c + 1; j < cols; j++) {
      if (walls[r][j] !== -2) break;
      if (lights[r][j]) return false;
    }
    
    return true;
  }
  
  function placeLight(r, c) {
    lights[r][c] = true;
    const litCells = [[r, c]];
    
    // 标记照亮
    lit[r][c] = true;
    for (let i = r - 1; i >= 0; i--) {
      if (walls[i][c] !== -2) break;
      if (!lit[i][c]) { lit[i][c] = true; litCells.push([i, c]); }
    }
    for (let i = r + 1; i < rows; i++) {
      if (walls[i][c] !== -2) break;
      if (!lit[i][c]) { lit[i][c] = true; litCells.push([i, c]); }
    }
    for (let j = c - 1; j >= 0; j--) {
      if (walls[r][j] !== -2) break;
      if (!lit[r][j]) { lit[r][j] = true; litCells.push([r, j]); }
    }
    for (let j = c + 1; j < cols; j++) {
      if (walls[r][j] !== -2) break;
      if (!lit[r][j]) { lit[r][j] = true; litCells.push([r, j]); }
    }
    
    return litCells;
  }
  
  function removeLight(litCells) {
    for (const [r, c] of litCells) {
      lit[r][c] = false;
    }
  }
  
  function checkNumberConstraints() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (walls[r][c] >= 0 && walls[r][c] <= 4) {
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (lights[nr][nc]) count++;
            }
          }
          if (count > walls[r][c]) return false;
        }
      }
    }
    return true;
  }
  
  function checkComplete() {
    // 所有白格都被照亮
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (walls[r][c] === -2 && !lit[r][c]) return false;
      }
    }
    
    // 数字约束完全满足
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (walls[r][c] >= 0 && walls[r][c] <= 4) {
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (lights[nr][nc]) count++;
            }
          }
          if (count !== walls[r][c]) return false;
        }
      }
    }
    
    return true;
  }
  
  function solve(idx) {
    if (solutions.length >= maxSolutions) return;
    
    if (!checkNumberConstraints()) return;
    
    // 找下一个未照亮的白格
    let found = false;
    for (let i = idx; i < rows * cols; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (walls[r][c] === -2 && !lit[r][c]) {
        found = true;
        
        // 尝试放灯
        if (canPlaceLight(r, c)) {
          const litCells = placeLight(r, c);
          solve(i + 1);
          removeLight(litCells);
          lights[r][c] = false;
        }
        
        // 也可以不放灯（如果这个格能被其他灯照亮）
        // 但如果这是必须放灯的位置，需要检查
        
        solve(i + 1);
        return;
      }
    }
    
    if (!found && checkComplete()) {
      // 找到一个解
      solutions.push(lights.map(row => row.slice()));
    }
  }
  
  solve(0);
  return solutions;
}

/**
 * 生成谜题
 */
function generatePuzzle(size, difficulty = 'easy', seed = Date.now()) {
  // 难度配置
  const config = {
    easy: { wallDensity: 0.15, numberRatio: 0.3 },
    medium: { wallDensity: 0.2, numberRatio: 0.25 },
    hard: { wallDensity: 0.25, numberRatio: 0.2 }
  };
  
  const { wallDensity, numberRatio } = config[difficulty] || config.easy;
  
  // 简单的随机数生成器（带种子）
  let rngState = seed;
  function random() {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  }
  
  const rows = size;
  const cols = size;
  
  // 初始化空网格
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(' '));
  
  // 放置墙壁（保留答案空间）
  const wallCount = Math.floor(rows * cols * wallDensity);
  const wallPositions = [];
  
  for (let i = 0; i < wallCount; i++) {
    let r, c;
    let attempts = 0;
    do {
      r = Math.floor(random() * rows);
      c = Math.floor(random() * cols);
      attempts++;
    } while (grid[r][c] !== ' ' && attempts < 100);
    
    if (grid[r][c] === ' ') {
      grid[r][c] = '#'; // 普通墙
      wallPositions.push([r, c]);
    }
  }
  
  // 给部分墙壁添加数字（基于假设的解）
  // 这里我们采用逆向方式：先假设一个解，再验证
  
  // 尝试求解，看是否有唯一解
  const solutions = solveAkari(grid, 2);
  
  if (solutions.length === 1) {
    // 有唯一解，返回
    return {
      grid: grid.map(row => row.map(cell => cell === '#' ? -1 : (cell === ' ' ? ' ' : cell))),
      answer: solutions[0],
      unique: true
    };
  }
  
  // 没有唯一解，需要调整墙壁和数字
  // 添加数字约束来缩小解空间
  
  // 选择一些墙添加数字（基于解的位置）
  const numberWalls = wallPositions.filter(() => random() < numberRatio);
  
  for (const [r, c] of numberWalls) {
    // 计算周围应该有多少灯（基于解）
    // 由于我们还没有解，这里随机给数字
    grid[r][c] = Math.floor(random() * 5);
  }
  
  // 再次验证
  const solutions2 = solveAkari(grid, 2);
  
  if (solutions2.length === 1) {
    return {
      grid: grid.map(row => row.map(cell => {
        if (typeof cell === 'number' && cell >= 0 && cell <= 4) return cell;
        if (cell === '#') return -1;
        return ' ';
      })),
      answer: solutions2[0],
      unique: true
    };
  }
  
  // 如果还是没有唯一解，返回失败
  return {
    grid: grid.map(row => row.map(cell => {
      if (typeof cell === 'number' && cell >= 0 && cell <= 4) return cell;
      if (cell === '#') return -1;
      return ' ';
    })),
    answer: null,
    unique: solutions2.length === 1,
    solutionCount: solutions2.length
  };
}

/**
 * 改进的生成器 - 自顶向下方法
 */
function generatePuzzleTopDown(size, difficulty = 'easy', maxAttempts = 50) {
  const config = {
    easy: size <= 7 ? { wallDensity: 0.12, minClues: 3, maxClues: 8 } : { wallDensity: 0.15, minClues: 5, maxClues: 12 },
    medium: size <= 10 ? { wallDensity: 0.18, minClues: 4, maxClues: 10 } : { wallDensity: 0.2, minClues: 6, maxClues: 15 },
    hard: { wallDensity: 0.22, minClues: 3, maxClues: 10 }
  };
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = Date.now() + attempt * 1000;
    const puzzle = generatePuzzle(size, difficulty, seed);
    
    if (puzzle.unique && puzzle.answer) {
      return puzzle;
    }
  }
  
  return null;
}

/**
 * 格式化输出
 */
function formatPuzzle(puzzle, id, difficulty) {
  const rows = puzzle.grid.length;
  
  // 将answer（布尔矩阵）转为坐标列表
  const answerCoords = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < rows; c++) {
      if (puzzle.answer && puzzle.answer[r][c]) {
        answerCoords.push([r, c]);
      }
    }
  }
  
  return {
    id: id,
    difficulty: difficulty,
    size: rows,
    grid: puzzle.grid,
    answer: answerCoords,
    seed: Date.now()
  };
}

/**
 * 批量生成
 */
async function generateBatch(difficulty, size, count, outputDir) {
  const sizes = {
    easy: 7,
    medium: 10,
    hard: 12
  };
  
  const actualSize = size || sizes[difficulty] || 7;
  const dir = path.join(outputDir, difficulty);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let successCount = 0;
  let failCount = 0;
  
  console.log(`开始生成 ${count} 个 ${difficulty} 难度谜题 (${actualSize}x${actualSize})...`);
  
  for (let i = 1; i <= count; i++) {
    const puzzle = generatePuzzleTopDown(actualSize, difficulty);
    
    if (puzzle && puzzle.unique) {
      const formatted = formatPuzzle(puzzle, i, difficulty);
      const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
      const filepath = path.join(dir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(formatted, null, 2));
      successCount++;
      
      if (successCount % 10 === 0) {
        console.log(`已生成 ${successCount} 个有效谜题...`);
      }
    } else {
      failCount++;
    }
    
    // 防止无限循环，如果失败太多就退出
    if (failCount > count * 3) {
      console.log(`失败次数过多，停止生成。已生成 ${successCount} 个谜题。`);
      break;
    }
  }
  
  console.log(`\n生成完成！`);
  console.log(`成功: ${successCount} 个`);
  console.log(`失败: ${failCount} 次`);
  
  return successCount;
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const difficulty = args[0] || 'easy';
  const count = parseInt(args[1]) || 10;
  const outputDir = args[2] || './data/akari';
  
  generateBatch(difficulty, null, count, outputDir).catch(console.error);
}

module.exports = { generatePuzzleTopDown, solveAkari, generateBatch };
