#!/usr/bin/env node
/**
 * Akari 生成器 v5 - 启发式方法
 * 
 * 思路：
 * 1. 创建空网格
 * 2. 随机放置几个数字墙作为约束
 * 3. 求解检查唯一性
 * 4. 若不唯一，添加更多约束
 * 5. 若唯一，输出谜题+答案
 */

const fs = require('fs');
const path = require('path');

// 常量
const CELL_EMPTY = 0;
const CELL_BLACK = 5;
const CELL_BLACK_0 = 5;
const CELL_BLACK_1 = 6;
const CELL_BLACK_2 = 7;
const CELL_BLACK_3 = 8;
const CELL_BLACK_4 = 9;

/**
 * 求解器 - 返回所有解（限制数量）
 */
function solveAkariAll(grid, maxSolutions = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  const solutions = [];
  const lights = Array(rows).fill(null).map(() => Array(cols).fill(false));
  const lit = Array(rows).fill(null).map(() => Array(cols).fill(false));
  
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  
  const markLit = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (grid[r][c] >= CELL_BLACK) return;
    lit[r][c] = true;
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] < CELL_BLACK) {
        lit[nr][nc] = true;
        nr += dr; nc += dc;
      }
    }
  };
  
  const isPartialValid = () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] >= CELL_BLACK_0 && grid[r][c] <= CELL_BLACK_4) {
          const required = grid[r][c] - CELL_BLACK_0;
          let cnt = 0;
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && lights[nr][nc]) cnt++;
          }
          if (cnt > required) return false;
        }
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (lights[r][c]) {
          for (const [dr, dc] of dirs) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] < CELL_BLACK) {
              if (lights[nr][nc]) return false;
              nr += dr; nc += dc;
            }
          }
        }
      }
    }
    return true;
  };
  
  const isComplete = () => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] < CELL_BLACK && !lit[r][c]) return false;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] >= CELL_BLACK_0 && grid[r][c] <= CELL_BLACK_4) {
          const required = grid[r][c] - CELL_BLACK_0;
          let cnt = 0;
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && lights[nr][nc]) cnt++;
          }
          if (cnt !== required) return false;
        }
      }
    }
    return true;
  };
  
  const solve = (idx) => {
    if (solutions.length >= maxSolutions) return;
    if (!isPartialValid()) return;
    
    // 找下一个未照亮白格
    for (let i = idx; i < rows * cols; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      if (grid[r][c] < CELL_BLACK && !lit[r][c]) {
        // 尝试放灯塔
        if (!lit[r][c]) { // 还没被照亮
          lights[r][c] = true;
          const prevLit = lit.map(row => row.slice());
          markLit(r, c);
          solve(i + 1);
          if (solutions.length >= maxSolutions) return;
          // 回溯
          lights[r][c] = false;
          for (let j = 0; j < rows; j++) {
            for (let k = 0; k < cols; k++) {
              lit[j][k] = prevLit[j][k];
            }
          }
        }
        // 不放灯塔
        solve(i + 1);
        return;
      }
    }
    
    if (isComplete()) {
      solutions.push(lights.map(row => row.slice()));
    }
  };
  
  solve(0);
  return solutions;
}

/**
 * 生成谜题
 */
function generatePuzzle(size, maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 创建空网格
    const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
    
    // 随机放置一些数字墙
    const wallCount = Math.floor(size * size * 0.15);
    const walls = [];
    
    for (let i = 0; i < wallCount; i++) {
      let r, c;
      let tries = 0;
      do {
        r = Math.floor(Math.random() * size);
        c = Math.floor(Math.random() * size);
        tries++;
      } while (grid[r][c] !== CELL_EMPTY && tries < 100);
      
      if (grid[r][c] === CELL_EMPTY) {
        walls.push([r, c]);
        grid[r][c] = CELL_BLACK; // 先放普通墙
      }
    }
    
    // 给部分墙添加数字
    for (const [r, c] of walls) {
      if (Math.random() < 0.6) {
        // 随机给一个数字（0-4）
        const num = Math.floor(Math.random() * 5);
        grid[r][c] = CELL_BLACK_0 + num;
      }
    }
    
    // 求解
    const solutions = solveAkariAll(grid, 2);
    
    if (solutions.length === 1) {
      // 唯一解
      const answerCoords = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solutions[0][r][c]) {
            answerCoords.push([r, c]);
          }
        }
      }
      
      // 转换为输出格式
      const outputGrid = grid.map(row => row.map(cell => {
        if (cell === CELL_EMPTY) return ' ';
        if (cell === CELL_BLACK) return '#';
        return cell - CELL_BLACK_0; // 数字墙
      }));
      
      return {
        size,
        grid: outputGrid,
        answer: answerCoords,
        unique: true
      };
    }
  }
  
  return null;
}

/**
 * 快速生成（使用预验证的简单模板）
 */
function generateFromPattern(size, difficulty) {
  // 简单模式：生成一个网格，确保有唯一解
  // 使用更保守的策略：先放少量灯塔，再添加约束
  
  const grid = Array(size).fill(null).map(() => Array(size).fill(' '));
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  
  // 在网格周围放置墙
  const wallPositions = [];
  
  // 角落的墙
  if (Math.random() < 0.5) {
    wallPositions.push([0, 0]);
    wallPositions.push([0, size-1]);
    wallPositions.push([size-1, 0]);
    wallPositions.push([size-1, size-1]);
  }
  
  // 边缘的墙
  for (let i = 1; i < size - 1; i++) {
    if (Math.random() < 0.2) {
      wallPositions.push([0, i]);
      wallPositions.push([size-1, i]);
    }
    if (Math.random() < 0.2) {
      wallPositions.push([i, 0]);
      wallPositions.push([i, size-1]);
    }
  }
  
  // 内部随机墙
  const innerWallCount = Math.floor(size * size * 0.1);
  for (let i = 0; i < innerWallCount; i++) {
    const r = 1 + Math.floor(Math.random() * (size - 2));
    const c = 1 + Math.floor(Math.random() * (size - 2));
    if (grid[r][c] === ' ') {
      wallPositions.push([r, c]);
    }
  }
  
  // 放置墙
  for (const [r, c] of wallPositions) {
    grid[r][c] = '#';
  }
  
  // 转换为数值网格求解
  const numGrid = grid.map(row => row.map(cell => {
    if (cell === ' ') return CELL_EMPTY;
    return CELL_BLACK;
  }));
  
  // 求解看是否有解
  const solutions = solveAkariAll(numGrid, 2);
  
  if (solutions.length === 1) {
    // 有唯一解，给部分墙添加数字
    const answerCoords = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (solutions[0][r][c]) {
          answerCoords.push([r, c]);
        }
      }
    }
    
    // 根据解添加数字
    for (const [r, c] of wallPositions) {
      let cnt = 0;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (solutions[0][nr][nc]) cnt++;
        }
      }
      if (cnt > 0 && Math.random() < 0.7) {
        grid[r][c] = cnt;
      }
    }
    
    return { size, grid, answer: answerCoords };
  }
  
  return null;
}

/**
 * 批量生成
 */
async function batchGenerate(difficulty, count, outputDir) {
  const sizes = { easy: 7, medium: 10, hard: 12 };
  const size = sizes[difficulty] || 7;
  
  const dir = path.join(outputDir, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let success = 0;
  let attempts = 0;
  const maxAttempts = count * 20;
  
  console.log(`生成 ${count} 个 ${difficulty} 谜题 (${size}x${size})...`);
  const startTime = Date.now();
  
  while (success < count && attempts < maxAttempts) {
    attempts++;
    
    // 尝试两种方法
    let result = generateFromPattern(size, difficulty);
    if (!result) {
      result = generatePuzzle(size, 5);
    }
    
    if (result) {
      success++;
      const data = {
        id: success,
        difficulty: difficulty,
        size: result.size,
        grid: result.grid,
        answer: result.answer,
        unique: true
      };
      
      const filename = `${difficulty}-${String(success).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
      
      if (success % 50 === 0) {
        console.log(`已生成 ${success}/${count}...`);
      }
    }
    
    // 超时保护（5分钟）
    if (Date.now() - startTime > 300000) {
      console.log('超时退出');
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`完成！成功: ${success}, 尝试: ${attempts}, 耗时: ${elapsed}s`);
  return success;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const difficulty = args[0] || 'easy';
  const count = parseInt(args[1]) || 100;
  const outputDir = args[2] || './data/akari';
  
  batchGenerate(difficulty, count, outputDir).catch(console.error);
}

module.exports = { solveAkariAll, generatePuzzle, batchGenerate };
