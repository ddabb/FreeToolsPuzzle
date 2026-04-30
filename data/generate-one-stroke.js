/**
 * ============================================================================
 * 一笔画（One-Stroke）题目批量生成器
 * ============================================================================
 *
 * 简单版本：随机放置洞，然后验证连通性
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 4, maxHoles: 8, count: 10 },
  medium: { rows: 8, cols: 8, minHoles: 10, maxHoles: 16, count: 10 },
  hard: { rows: 10, cols: 10, minHoles: 15, maxHoles: 22, count: 10 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');

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

function isConnected(rows, cols, holes) {
  const holeSet = new Set(holes);
  
  let startCell = -1;
  for (let i = 0; i < rows * cols; i++) {
    if (!holeSet.has(i)) {
      startCell = i;
      break;
    }
  }
  
  if (startCell === -1) return false;
  
  const visited = new Set([startCell]);
  const queue = [startCell];
  
  while (queue.length > 0) {
    const current = queue.shift();
    const r = Math.floor(current / cols);
    const c = current % cols;
    
    const neighbors = [];
    if (r > 0) neighbors.push(current - cols);
    if (r < rows - 1) neighbors.push(current + cols);
    if (c > 0) neighbors.push(current - 1);
    if (c < cols - 1) neighbors.push(current + 1);
    
    for (const n of neighbors) {
      if (!holeSet.has(n) && !visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  
  let validCount = 0;
  for (let i = 0; i < rows * cols; i++) {
    if (!holeSet.has(i)) validCount++;
  }
  
  return visited.size === validCount;
}

function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const totalCells = rows * cols;
  const maxAttempts = 1000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const allCells = [];
    for (let i = 0; i < totalCells; i++) {
      allCells.push(i);
    }
    
    shuffle(allCells);
    
    const holeCount = minHoles;
    const holes = allCells.slice(0, holeCount);
    
    if (!isConnected(rows, cols, holes)) {
      continue;
    }
    
    const solver = new SmartSolver(rows, cols, holes);
    const answer = solver.solve(5000);
    
    if (answer && answer.length === totalCells - holeCount) {
      return { holes, answer, row: rows, col: cols };
    }
  }
  
  throw new Error(`无法生成有效的题目 (${rows}x${cols})`);
}

class SmartSolver {
  constructor(rows, cols, holes) {
    this.rows = rows;
    this.cols = cols;
    this.holeSet = new Set(holes);
    this.validCount = rows * cols - holes.length;
    this.visited = new Array(rows * cols).fill(false);
    this.path = [];
    this.deadline = 0;
  }
  
  neighbors(cell) {
    const r = Math.floor(cell / this.cols);
    const c = cell % this.cols;
    const nbrs = [];
    
    if (r > 0) nbrs.push(cell - this.cols);
    if (r < this.rows - 1) nbrs.push(cell + this.cols);
    if (c > 0) nbrs.push(cell - 1);
    if (c < this.cols - 1) nbrs.push(cell + 1);
    
    return nbrs.filter(n => !this.holeSet.has(n) && !this.visited[n]);
  }
  
  countAvailableNeighbors(cell) {
    let count = 0;
    const r = Math.floor(cell / this.cols);
    const c = cell % this.cols;
    
    if (r > 0 && !this.holeSet.has(cell - this.cols) && !this.visited[cell - this.cols]) count++;
    if (r < this.rows - 1 && !this.holeSet.has(cell + this.cols) && !this.visited[cell + this.cols]) count++;
    if (c > 0 && !this.holeSet.has(cell - 1) && !this.visited[cell - 1]) count++;
    if (c < this.cols - 1 && !this.holeSet.has(cell + 1) && !this.visited[cell + 1]) count++;
    
    return count;
  }
  
  dfs(cell, depth) {
    if (Date.now() > this.deadline) return false;
    
    this.visited[cell] = true;
    this.path.push(cell);
    
    if (depth === this.validCount) return true;
    
    const nbrs = this.neighbors(cell);
    nbrs.sort((a, b) => this.countAvailableNeighbors(a) - this.countAvailableNeighbors(b));
    
    for (const next of nbrs) {
      if (this.dfs(next, depth + 1)) return true;
    }
    
    this.visited[cell] = false;
    this.path.pop();
    return false;
  }
  
  solve(maxMs) {
    this.deadline = Date.now() + maxMs;
    
    const starts = [];
    for (let i = 0; i < this.rows * this.cols; i++) {
      if (!this.holeSet.has(i)) starts.push(i);
    }
    
    shuffle(starts);
    
    for (const start of starts) {
      this.visited = new Array(this.rows * this.cols).fill(false);
      this.path = [];
      
      if (this.dfs(start, 1)) {
        return this.path.slice();
      }
    }
    
    return null;
  }
}

function generateAll() {
  console.log('开始生成 one-stroke 题目...\n');
  
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  let totalTime = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    console.log(`生成 ${difficulty} 难度 (${config.rows}x${config.cols}, ${config.minHoles}洞)...`);
    
    let success = 0;
    let fail = 0;
    let difficultyTime = 0;
    
    for (let i = 1; i <= config.count; i++) {
      const startTime = Date.now();
      
      let puzzle = null;
      try {
        puzzle = generatePuzzle(
          config.rows,
          config.cols,
          config.minHoles,
          config.maxHoles
        );
      } catch (e) {
        console.error(e.message);
      }
      
      const endTime = Date.now();
      difficultyTime += (endTime - startTime);
      
      if (puzzle && puzzle.holes && puzzle.holes.length >= config.minHoles && puzzle.answer) {
        const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        
        const data = {
          size: config.rows,
          row: config.rows,
          col: config.cols,
          holes: puzzle.holes.sort((a, b) => a - b),
          answer: puzzle.answer,
          difficulty: difficulty,
          id: i
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        success++;
      } else {
        fail++;
      }
    }
    
    const avgTime = difficultyTime / config.count;
    console.log(`\n  成功: ${success}, 失败: ${fail}, 平均耗时: ${avgTime.toFixed(2)}ms, 本轮总耗时: ${(difficultyTime / 1000).toFixed(2)}s\n`);
    
    total += success;
    totalTime += difficultyTime;
  }
  
  console.log(`完成！共生成 ${total} 个题目`);
  console.log(`总耗时: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

generateAll();