#!/usr/bin/env node
/**
 * Akari (Light Up) Puzzle Generator - v2 (Top-Down Approach)
 * 
 * 算法：
 * 1. 先生成有效的灯塔布局（解）
 * 2. 基于解放置墙壁和数字约束
 * 3. 验证唯一性
 * 4. 精简线索直到恰好唯一解
 */

const fs = require('fs');
const path = require('path');

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

class AkariGenerator {
  constructor(size, seed = Date.now()) {
    this.size = size;
    this.seed = seed;
    this.rngState = seed;
    
    this.grid = []; // -2=白格, -1=墙, 0-4=数字墙
    this.lights = []; // 解：灯塔位置
  }
  
  random() {
    this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
    return this.rngState / 0x7fffffff;
  }
  
  randomInt(max) {
    return Math.floor(this.random() * max);
  }
  
  /**
   * 生成初始解：随机放置灯塔，确保合法（不互相照亮）
   */
  generateSolution() {
    this.lights = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(-2));
    
    // 先随机放置一些墙壁
    const wallDensity = 0.15;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.random() < wallDensity) {
          this.grid[r][c] = -1; // 墙
        }
      }
    }
    
    // 收集所有白格
    const whiteCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === -2) {
          whiteCells.push([r, c]);
        }
      }
    }
    
    // 随机打乱
    for (let i = whiteCells.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [whiteCells[i], whiteCells[j]] = [whiteCells[j], whiteCells[i]];
    }
    
    // 贪心放置灯塔，确保照亮所有白格
    const lit = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
    
    // 先尝试随机放置
    for (const [r, c] of whiteCells) {
      if (lit[r][c]) continue;
      
      // 检查能否放灯塔
      if (this.canPlaceLight(r, c, lit)) {
        this.lights[r][c] = true;
        this.markLit(r, c, lit);
      }
    }
    
    // 检查是否所有白格都被照亮
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === -2 && !lit[r][c]) {
          // 有未照亮格子，尝试添加灯塔
          if (this.canPlaceLight(r, c, lit)) {
            this.lights[r][c] = true;
            this.markLit(r, c, lit);
          }
        }
      }
    }
    
    return this.verifySolution();
  }
  
  canPlaceLight(r, c, lit) {
    // 检查四个方向是否有其他灯塔
    for (let i = r - 1; i >= 0; i--) {
      if (this.grid[i][c] !== -2) break;
      if (this.lights[i][c]) return false;
    }
    for (let i = r + 1; i < this.size; i++) {
      if (this.grid[i][c] !== -2) break;
      if (this.lights[i][c]) return false;
    }
    for (let j = c - 1; j >= 0; j--) {
      if (this.grid[r][j] !== -2) break;
      if (this.lights[r][j]) return false;
    }
    for (let j = c + 1; j < this.size; j++) {
      if (this.grid[r][j] !== -2) break;
      if (this.lights[r][j]) return false;
    }
    return true;
  }
  
  markLit(r, c, lit) {
    lit[r][c] = true;
    for (let i = r - 1; i >= 0; i--) {
      if (this.grid[i][c] !== -2) break;
      lit[i][c] = true;
    }
    for (let i = r + 1; i < this.size; i++) {
      if (this.grid[i][c] !== -2) break;
      lit[i][c] = true;
    }
    for (let j = c - 1; j >= 0; j--) {
      if (this.grid[r][j] !== -2) break;
      lit[r][j] = true;
    }
    for (let j = c + 1; j < this.size; j++) {
      if (this.grid[r][j] !== -2) break;
      lit[r][j] = true;
    }
  }
  
  verifySolution() {
    // 验证所有白格都被照亮
    const lit = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.lights[r][c]) {
          this.markLit(r, c, lit);
        }
      }
    }
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === -2 && !lit[r][c]) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * 添加数字线索（基于解）
   */
  addNumberClues() {
    // 找所有墙，给部分墙添加数字（等于相邻灯塔数）
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === -1) {
          // 计算相邻灯塔数
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
              if (this.lights[nr][nc]) count++;
            }
          }
          // 有一定概率添加数字
          if (count > 0 && this.random() < 0.6) {
            this.grid[r][c] = count;
          }
        }
      }
    }
  }
  
  /**
   * 求解器 - 返回所有解（用于验证唯一性）
   */
  solve(maxSolutions = 2) {
    const walls = this.grid;
    const size = this.size;
    
    const solutions = [];
    const lights = Array(size).fill(null).map(() => Array(size).fill(false));
    const lit = Array(size).fill(null).map(() => Array(size).fill(false));
    
    function canPlaceLight(r, c) {
      if (walls[r][c] !== -2) return false;
      if (lights[r][c]) return false;
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
    }
    
    function placeLight(r, c) {
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
    }
    
    function removeLight(litCells) {
      for (const [r, c] of litCells) lit[r][c] = false;
    }
    
    function checkNumberConstraints() {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] >= 0 && walls[r][c] <= 4) {
            let count = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) count++;
            }
            if (count > walls[r][c]) return false;
          }
        }
      }
      return true;
    }
    
    function isComplete() {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] === -2 && !lit[r][c]) return false;
        }
      }
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (walls[r][c] >= 0 && walls[r][c] <= 4) {
            let count = 0;
            for (const [dr, dc] of DIRS) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) count++;
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
      
      for (let i = idx; i < size * size; i++) {
        const r = Math.floor(i / size), c = i % size;
        if (walls[r][c] === -2 && !lit[r][c]) {
          // 尝试放灯
          if (canPlaceLight(r, c)) {
            const litCells = placeLight(r, c);
            solve(i + 1);
            removeLight(litCells);
            lights[r][c] = false;
          }
          // 不放灯继续
          solve(i + 1);
          return;
        }
      }
      
      if (isComplete()) {
        solutions.push(lights.map(row => row.slice()));
      }
    }
    
    solve(0);
    return solutions;
  }
  
  /**
   * 完整生成流程
   */
  generate(maxAttempts = 20) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.seed = this.seed + attempt * 1000;
      this.rngState = this.seed;
      
      // 生成解
      if (!this.generateSolution()) continue;
      
      // 添加数字线索
      this.addNumberClues();
      
      // 验证唯一性
      const solutions = this.solve(2);
      
      if (solutions.length === 1) {
        // 唯一解，返回
        return {
          grid: this.grid.map(row => row.map(cell => {
            if (cell === -2) return ' ';
            if (cell === -1) return '#';
            return cell;
          })),
          answer: this.lights,
          unique: true
        };
      }
    }
    
    return null;
  }
}

/**
 * 格式化输出
 */
function formatPuzzle(result, id, difficulty) {
  const size = result.grid.length;
  
  const answerCoords = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (result.answer[r][c]) {
        answerCoords.push([r, c]);
      }
    }
  }
  
  return {
    id: id,
    difficulty: difficulty,
    size: size,
    grid: result.grid,
    answer: answerCoords,
    seed: Date.now()
  };
}

/**
 * 批量生成
 */
async function generateBatch(difficulty, count, outputDir) {
  const sizes = { easy: 7, medium: 10, hard: 12 };
  const size = sizes[difficulty] || 7;
  
  const dir = path.join(outputDir, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let success = 0;
  let failed = 0;
  
  console.log(`生成 ${count} 个 ${difficulty} 谜题 (${size}x${size})...`);
  const startTime = Date.now();
  
  for (let i = 1; i <= count && success < count; i++) {
    const gen = new AkariGenerator(size, Date.now() + i * 1000);
    const result = gen.generate(30);
    
    if (result) {
      const formatted = formatPuzzle(result, success + 1, difficulty);
      const filename = `${difficulty}-${String(success + 1).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(formatted, null, 2));
      success++;
      
      if (success % 10 === 0) {
        console.log(`已生成 ${success}/${count}...`);
      }
    } else {
      failed++;
    }
    
    // 防止过多失败
    if (failed > count * 5) {
      console.log(`失败过多，停止生成。`);
      break;
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成！成功: ${success}, 失败: ${failed}, 耗时: ${elapsed}s`);
  
  return success;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const difficulty = args[0] || 'easy';
  const count = parseInt(args[1]) || 10;
  const outputDir = args[2] || './output';
  
  generateBatch(difficulty, count, outputDir).catch(console.error);
}

module.exports = { AkariGenerator, generateBatch };
