#!/usr/bin/env node
/**
 * Akari 生成器 v3 - 简化版
 * 
 * 使用更直接的方法：
 * 1. 创建空网格
 * 2. 放置少量灯塔作为唯一解的锚点
 * 3. 基于灯塔位置推导墙壁和数字
 * 4. 验证唯一性
 */

const fs = require('fs');
const path = require('path');

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

class AkariPuzzle {
  constructor(size) {
    this.size = size;
    this.grid = Array(size).fill(null).map(() => Array(size).fill(' '));
    this.lights = Array(size).fill(null).map(() => Array(size).fill(false));
  }
  
  copy() {
    const p = new AkariPuzzle(this.size);
    p.grid = this.grid.map(row => row.slice());
    p.lights = this.lights.map(row => row.slice());
    return p;
  }
  
  /**
   * 放置灯塔，更新照亮状态
   */
  placeLight(r, c, litGrid) {
    this.lights[r][c] = true;
    litGrid[r][c] = true;
    
    // 向四个方向照亮
    for (let i = r - 1; i >= 0; i--) {
      if (this.grid[i][c] !== ' ') break;
      litGrid[i][c] = true;
    }
    for (let i = r + 1; i < this.size; i++) {
      if (this.grid[i][c] !== ' ') break;
      litGrid[i][c] = true;
    }
    for (let j = c - 1; j >= 0; j--) {
      if (this.grid[r][j] !== ' ') break;
      litGrid[r][j] = true;
    }
    for (let j = c + 1; j < this.size; j++) {
      if (this.grid[r][j] !== ' ') break;
      litGrid[r][j] = true;
    }
  }
  
  /**
   * 检查是否可以在该位置放灯塔（不被其他灯塔照亮）
   */
  canPlace(r, c, litGrid) {
    if (this.grid[r][c] !== ' ') return false;
    if (litGrid[r][c]) return false;
    return true;
  }
  
  /**
   * 基于灯塔布局生成墙壁和数字
   */
  deriveWalls(litGrid) {
    // 找所有未被照亮的格子 - 这些必须是墙
    // 但我们已经让所有格子都被照亮，所以这是正常情况
    
    // 在灯塔之间的"对角线"位置放置墙
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.lights[r][c]) continue;
        if (this.grid[r][c] !== ' ') continue;
        
        // 检查是否有灯塔在这一行或这一列照亮这个格子
        // 如果有，这格是白格
        // 如果没有且是边界，放墙
      }
    }
    
    // 更简单的方法：在灯塔周围添加一些墙
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.lights[r][c]) {
          // 灯塔周围有一定概率放墙
          for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
              if (!this.lights[nr][nc] && this.grid[nr][nc] === ' ' && Math.random() < 0.3) {
                this.grid[nr][nc] = '#';
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * 给墙壁添加数字（等于相邻灯塔数）
   */
  addNumbers() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === '#') {
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
              if (this.lights[nr][nc]) count++;
            }
          }
          if (count > 0 && Math.random() < 0.7) {
            this.grid[r][c] = count;
          }
        }
      }
    }
  }
  
  /**
   * 求解器
   */
  solve(maxSolutions = 2) {
    const size = this.size;
    const grid = this.grid;
    
    // 解析网格
    const walls = grid.map(row => row.map(cell => {
      if (typeof cell === 'number') return cell;
      if (cell === '#') return -1;
      return -2; // 白格
    }));
    
    const solutions = [];
    const lights = Array(size).fill(null).map(() => Array(size).fill(false));
    const lit = Array(size).fill(null).map(() => Array(size).fill(false));
    
    const canPlace = (r, c) => {
      if (walls[r][c] !== -2) return false;
      if (lit[r][c]) return false;
      
      for (let i = r - 1; i >= 0; i--) {
        if (walls[i][c] !== -2) break;
        if (lights[i][c]) return false;
      }
      for (let i = r + 1; i < size; i++) {
        if (walls[i][c] !== -2) break;
        if (lights[i][c]) return false;
      }
      for (let j = c - 1; j >= 0; j--) {
        if (walls[r][j] !== -2) break;
        if (lights[r][j]) return false;
      }
      for (let j = c + 1; j < size; j++) {
        if (walls[r][j] !== -2) break;
        if (lights[r][j]) return false;
      }
      return true;
    };
    
    const placeLight = (r, c) => {
      lights[r][c] = true;
      const litCells = [[r, c]];
      lit[r][c] = true;
      
      for (let i = r - 1; i >= 0; i--) {
        if (walls[i][c] !== -2) break;
        if (!lit[i][c]) { lit[i][c] = true; litCells.push([i, c]); }
      }
      for (let i = r + 1; i < size; i++) {
        if (walls[i][c] !== -2) break;
        if (!lit[i][c]) { lit[i][c] = true; litCells.push([i, c]); }
      }
      for (let j = c - 1; j >= 0; j--) {
        if (walls[r][j] !== -2) break;
        if (!lit[r][j]) { lit[r][j] = true; litCells.push([r, j]); }
      }
      for (let j = c + 1; j < size; j++) {
        if (walls[r][j] !== -2) break;
        if (!lit[r][j]) { lit[r][j] = true; litCells.push([r, j]); }
      }
      return litCells;
    };
    
    const removeLight = (litCells) => {
      for (const [r, c] of litCells) lit[r][c] = false;
    };
    
    const checkNumbers = () => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] >= 0) {
            let cnt = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) cnt++;
            }
            if (cnt > walls[r][c]) return false;
          }
        }
      }
      return true;
    };
    
    const isComplete = () => {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] === -2 && !lit[r][c]) return false;
        }
      }
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] >= 0) {
            let cnt = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) cnt++;
            }
            if (cnt !== walls[r][c]) return false;
          }
        }
      }
      return true;
    };
    
    const solve = (idx) => {
      if (solutions.length >= maxSolutions) return;
      if (!checkNumbers()) return;
      
      for (let i = idx; i < size * size; i++) {
        const r = Math.floor(i / size), c = i % size;
        if (walls[r][c] === -2 && !lit[r][c]) {
          // 放灯
          if (canPlace(r, c)) {
            const litCells = placeLight(r, c);
            solve(i + 1);
            removeLight(litCells);
            lights[r][c] = false;
          }
          // 不放灯
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
}

/**
 * 生成谜题 - 最简单的方法
 */
function generatePuzzle(size, maxAttempts = 50) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const p = new AkariPuzzle(size);
    const litGrid = Array(size).fill(null).map(() => Array(size).fill(false));
    
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
    
    // 贪心放置灯塔
    for (const [r, c] of cells) {
      if (p.canPlace(r, c, litGrid)) {
        p.placeLight(r, c, litGrid);
      }
    }
    
    // 检查所有白格都被照亮
    let allLit = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (p.grid[r][c] === ' ' && !litGrid[r][c]) {
          allLit = false;
          break;
        }
      }
    }
    
    if (!allLit) continue;
    
    // 添加墙壁和数字
    p.deriveWalls(litGrid);
    p.addNumbers();
    
    // 验证唯一解
    const solutions = p.solve(2);
    
    if (solutions.length === 1) {
      // 验证解是否匹配我们生成的灯塔布局
      let match = true;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solutions[0][r][c] !== p.lights[r][c]) {
            match = false;
            break;
          }
        }
      }
      
      if (match) {
        return p;
      }
    }
  }
  
  return null;
}

/**
 * 格式化输出
 */
function formatOutput(puzzle, id, difficulty) {
  const answer = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      if (puzzle.lights[r][c]) {
        answer.push([r, c]);
      }
    }
  }
  
  return {
    id: id,
    difficulty: difficulty,
    size: puzzle.size,
    grid: puzzle.grid,
    answer: answer,
    seed: Date.now()
  };
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
  console.log(`开始生成 ${count} 个 ${difficulty} 谜题 (${size}x${size})...`);
  
  const startTime = Date.now();
  
  while (success < count) {
    const puzzle = generatePuzzle(size);
    
    if (puzzle) {
      success++;
      const data = formatOutput(puzzle, success, difficulty);
      const filename = `${difficulty}-${String(success).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
      
      if (success % 10 === 0) {
        console.log(`已生成 ${success}/${count}...`);
      }
    }
    
    // 超时保护
    if (Date.now() - startTime > 300000) { // 5分钟
      console.log('超时退出');
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`完成！成功: ${success}, 耗时: ${elapsed}s`);
  
  return success;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const difficulty = args[0] || 'easy';
  const count = parseInt(args[1]) || 10;
  const outputDir = args[2] || './output';
  
  batchGenerate(difficulty, count, outputDir).catch(console.error);
}

module.exports = { generatePuzzle, batchGenerate, AkariPuzzle };
