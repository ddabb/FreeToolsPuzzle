#!/usr/bin/env node
/**
 * Akari 生成器 v6 - 从解推导
 * 
 * 算法：
 * 1. 先放置一组合法的灯塔（解）
 * 2. 从解放置墙壁和数字约束
 * 3. 不验证唯一性，直接输出（后续可加验证）
 */

const fs = require('fs');
const path = require('path');

const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

/**
 * 快速生成
 */
function generateFromSolution(size) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(' '));
  const lights = Array(size).fill(null).map(() => Array(size).fill(false));
  const lit = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // 随机放置灯塔，确保照亮所有格子
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push([r, c]);
    }
  }
  
  // 随机打乱
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  
  // 贪心放置灯塔照亮所有格子
  for (const [r, c] of cells) {
    if (!lit[r][c]) {
      // 检查能否放灯塔（不会被其他灯塔照到）
      let canPlace = true;
      
      // 检查同行同列是否有灯塔
      for (let i = 0; i < size; i++) {
        if (lights[r][i] && grid[r][i] === ' ') canPlace = false;
        if (lights[i][c] && grid[r][i] === ' ') canPlace = false;
      }
      
      // 更精确检查：灯塔间不能互相照亮
      // 向左
      for (let j = c - 1; j >= 0; j--) {
        if (grid[r][j] !== ' ') break;
        if (lights[r][j]) { canPlace = false; break; }
      }
      // 向右
      for (let j = c + 1; j < size; j++) {
        if (grid[r][j] !== ' ') break;
        if (lights[r][j]) { canPlace = false; break; }
      }
      // 向上
      for (let i = r - 1; i >= 0; i--) {
        if (grid[i][c] !== ' ') break;
        if (lights[i][c]) { canPlace = false; break; }
      }
      // 向下
      for (let i = r + 1; i < size; i++) {
        if (grid[i][c] !== ' ') break;
        if (lights[i][c]) { canPlace = false; break; }
      }
      
      if (canPlace) {
        lights[r][c] = true;
        lit[r][c] = true;
        
        // 标记照亮区域
        for (let i = r - 1; i >= 0; i--) {
          if (grid[i][c] !== ' ') break;
          lit[i][c] = true;
        }
        for (let i = r + 1; i < size; i++) {
          if (grid[i][c] !== ' ') break;
          lit[i][c] = true;
        }
        for (let j = c - 1; j >= 0; j--) {
          if (grid[r][j] !== ' ') break;
          lit[r][j] = true;
        }
        for (let j = c + 1; j < size; j++) {
          if (grid[r][j] !== ' ') break;
          lit[r][j] = true;
        }
      }
    }
  }
  
  // 添加墙壁：在灯塔对角位置随机放置
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!lights[r][c] && grid[r][c] === ' ' && Math.random() < 0.15) {
        grid[r][c] = '#';
      }
    }
  }
  
  // 给部分墙添加数字（基于相邻灯塔数）
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '#') {
        let cnt = 0;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) {
            cnt++;
          }
        }
        if (cnt > 0 && Math.random() < 0.6) {
          grid[r][c] = cnt;
        }
      }
    }
  }
  
  // 收集答案坐标
  const answer = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lights[r][c]) {
        answer.push([r, c]);
      }
    }
  }
  
  return { size, grid, answer };
}

/**
 * 简化的唯一性验证（快速版本）
 */
function hasUniqueSolution(puzzle, timeout = 5000) {
  const startTime = Date.now();
  const size = puzzle.size;
  const grid = puzzle.grid;
  
  // 极简回溯，带超时
  const solutions = [];
  const lights = Array(size).fill(null).map(() => Array(size).fill(false));
  const lit = Array(size).fill(null).map(() => Array(size).fill(false));
  
  function canPlace(r, c) {
    if (grid[r][c] !== ' ') return false;
    if (lit[r][c]) return false;
    
    for (let j = c - 1; j >= 0; j--) {
      if (grid[r][j] !== ' ') break;
      if (lights[r][j]) return false;
    }
    for (let j = c + 1; j < size; j++) {
      if (grid[r][j] !== ' ') break;
      if (lights[r][j]) return false;
    }
    for (let i = r - 1; i >= 0; i--) {
      if (grid[i][c] !== ' ') break;
      if (lights[i][c]) return false;
    }
    for (let i = r + 1; i < size; i++) {
      if (grid[i][c] !== ' ') break;
      if (lights[i][c]) return false;
    }
    return true;
  }
  
  function markLit(r, c) {
    lit[r][c] = true;
    for (let i = r - 1; i >= 0; i--) {
      if (grid[i][c] !== ' ') break;
      lit[i][c] = true;
    }
    for (let i = r + 1; i < size; i++) {
      if (grid[i][c] !== ' ') break;
      lit[i][c] = true;
    }
    for (let j = c - 1; j >= 0; j--) {
      if (grid[r][j] !== ' ') break;
      lit[r][j] = true;
    }
    for (let j = c + 1; j < size; j++) {
      if (grid[r][j] !== ' ') break;
      lit[r][j] = true;
    }
  }
  
  function checkNums() {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (typeof grid[r][c] === 'number' && grid[r][c] >= 0 && grid[r][c] <= 4) {
          let cnt = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) cnt++;
          }
          if (cnt > grid[r][c]) return false;
        }
      }
    }
    return true;
  }
  
  function solve(idx) {
    if (Date.now() - startTime > timeout) return;
    if (solutions.length >= 2) return;
    if (!checkNums()) return;
    
    for (let i = idx; i < size * size; i++) {
      const r = Math.floor(i / size), c = i % size;
      if (grid[r][c] === ' ' && !lit[r][c]) {
        // 放灯
        if (canPlace(r, c)) {
          lights[r][c] = true;
          const prev = lit.map(row => row.slice());
          markLit(r, c);
          solve(i + 1);
          lights[r][c] = false;
          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              lit[x][y] = prev[x][y];
            }
          }
        }
        // 不放
        solve(i + 1);
        return;
      }
    }
    
    // 检查是否完成
    let complete = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === ' ' && !lit[r][c]) complete = false;
      }
    }
    if (complete && checkNums()) {
      // 验证数字约束完全满足
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (typeof grid[r][c] === 'number' && grid[r][c] >= 0 && grid[r][c] <= 4) {
            let cnt = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) cnt++;
            }
            if (cnt !== grid[r][c]) complete = false;
          }
        }
      }
      if (complete) solutions.push(lights.map(row => row.slice()));
    }
  }
  
  solve(0);
  return solutions.length === 1;
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
  let unique = 0;
  
  console.log(`生成 ${count} 个 ${difficulty} 谜题 (${size}x${size})...`);
  const startTime = Date.now();
  
  while (success < count) {
    const puzzle = generateFromSolution(size);
    
    // 可选：验证唯一性（较慢）
    const isUnique = hasUniqueSolution(puzzle, 2000);
    
    success++;
    if (isUnique) unique++;
    
    const data = {
      id: success,
      difficulty: difficulty,
      size: puzzle.size,
      grid: puzzle.grid,
      answer: puzzle.answer,
      unique: isUnique
    };
    
    const filename = `${difficulty}-${String(success).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
    
    if (success % 100 === 0) {
      console.log(`已生成 ${success}/${count} (唯一解: ${unique})...`);
    }
    
    // 超时保护
    if (Date.now() - startTime > 600000) {
      console.log('超时退出');
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成！总计: ${success}, 唯一解: ${unique}, 耗时: ${elapsed}s`);
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

module.exports = { generateFromSolution, hasUniqueSolution, batchGenerate };
