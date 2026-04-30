const fs = require('fs');
const path = require('path');
const GridPathFinder = require('../packages/math/utils/GridPathFinder');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class SmartSolver {
  constructor(rows, cols, holes) {
    this.rows = rows;
    this.cols = cols;
    this.total = rows * cols;
    this.holeSet = new Set(holes);
    this.validCount = this.total - holes.length;
    this.path = [];
    this.visited = new Uint8Array(this.total);
    this.deadline = 0;
  }

  neighbors(cell) {
    const r = Math.floor(cell / this.cols), c = cell % this.cols;
    const result = [];
    if (r > 0) result.push(cell - this.cols);
    if (r < this.rows - 1) result.push(cell + this.cols);
    if (c > 0) result.push(cell - 1);
    if (c < this.cols - 1) result.push(cell + 1);
    return result;
  }

  countAvailableNeighbors(cell) {
    let count = 0;
    for (const n of this.neighbors(cell)) {
      if (!this.holeSet.has(n) && !this.visited[n]) count++;
    }
    return count;
  }

  sortByWarnsdorff(neighbors) {
    const scored = neighbors.map(n => ({
      cell: n,
      score: this.countAvailableNeighbors(n)
    }));
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return Math.random() - 0.5;
    });
    return scored.map(s => s.cell);
  }

  dfs(cell, depth) {
    if (depth === this.validCount) return true;
    if (Date.now() > this.deadline) return false;

    const nbrs = this.neighbors(cell).filter(n =>
      !this.holeSet.has(n) && !this.visited[n]
    );
    if (!nbrs.length) return false;

    const ordered = this.sortByWarnsdorff(nbrs);
    for (const next of ordered) {
      this.visited[next] = 1;
      this.path[depth] = next;
      if (this.dfs(next, depth + 1)) return true;
      this.visited[next] = 0;
    }
    return false;
  }

  solve(maxMs) {
    this.deadline = Date.now() + maxMs;
    const starts = [];
    for (let i = 0; i < this.total; i++) {
      if (!this.holeSet.has(i)) starts.push(i);
    }
    for (let i = starts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [starts[i], starts[j]] = [starts[j], starts[i]];
    }
    const timePerStart = Math.max(50, Math.floor(maxMs / starts.length));
    for (const start of starts) {
      if (Date.now() > this.deadline) break;
      this.path = [start];
      this.visited.fill(0);
      this.visited[start] = 1;
      const saved = this.deadline;
      this.deadline = Math.min(saved, Date.now() + timePerStart);
      if (this.dfs(start, 1)) return this.path.slice();
      this.deadline = saved;
    }
    return null;
  }
}

function generateRandomHolesWalk(rows, cols, minHoles, maxHoles) {
  const totalCells = rows * cols;
  const grid = new Array(totalCells).fill(0);
  const visited = new Set();

  const start = Math.floor(Math.random() * totalCells);
  visited.add(start);
  
  let current = start;

  while (visited.size < totalCells) {
    const stepMin = 2;
    const stepMax = 5;
    const steps = Math.floor(Math.random() * (stepMax - stepMin + 1)) + stepMin;
    
    let walked = false;
    for (let s = 0; s < steps; s++) {
      const neighbors = [];
      const r = Math.floor(current / cols);
      const c = current % cols;
      
      if (r > 0 && !visited.has(current - cols)) neighbors.push(current - cols);
      if (r < rows - 1 && !visited.has(current + cols)) neighbors.push(current + cols);
      if (c > 0 && !visited.has(current - 1)) neighbors.push(current - 1);
      if (c < cols - 1 && !visited.has(current + 1)) neighbors.push(current + 1);
      
      if (neighbors.length === 0) break;
      
      shuffle(neighbors);
      current = neighbors[0];
      visited.add(current);
      walked = true;
    }
    
    if (!walked) break;
    
    const availableCells = [];
    for (let i = 0; i < totalCells; i++) {
      if (!visited.has(i) && grid[i] === 0) availableCells.push(i);
    }
    
    if (availableCells.length > 0) {
      shuffle(availableCells);
      const hole = availableCells[Math.floor(Math.random() * availableCells.length)];
      grid[hole] = 1;
    }
  }
  
  const holes = [];
  for (let i = 0; i < totalCells; i++) {
    if (grid[i] === 1) holes.push(i);
  }
  
  const targetHoles = minHoles + Math.floor(Math.random() * (maxHoles - minHoles + 1));
  
  if (holes.length < targetHoles) {
    const available = [];
    for (let i = 0; i < totalCells; i++) {
      if (grid[i] === 0) available.push(i);
    }
    shuffle(available);
    const addCount = Math.min(targetHoles - holes.length, available.length);
    for (let i = 0; i < addCount; i++) {
      holes.push(available[i]);
    }
  } else if (holes.length > targetHoles) {
    shuffle(holes);
    holes.length = targetHoles;
  }
  
  return holes;
}

function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const maxAttempts = 100;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const holes = generateRandomHolesWalk(rows, cols, minHoles, maxHoles);
    
    const verifier = new GridPathFinder(rows, cols, holes);
    if (!verifier.isOneStroke()) continue;
    
    const solver = new SmartSolver(rows, cols, holes);
    const answer = solver.solve(5000);
    
    if (answer && answer.length === rows * cols - holes.length) {
      return { holes, answer, row: rows, col: cols };
    }
  }
  
  const holes = GridPathFinder.generateValidPuzzle(rows, cols, 0.3);
  const solver = new SmartSolver(rows, cols, holes);
  const answer = solver.solve(5000);
  
  return { holes, answer, row: rows, col: cols };
}

function visualizeGrid(rows, cols, holes) {
  const holeSet = new Set(holes);
  let s = '\n';
  for (let r = 0; r < rows; r++) {
    let row = '';
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      if (holeSet.has(cell)) row += 'XX ';
      else row += '-- ';
    }
    s += row + '\n';
  }
  return s;
}

function checkClustering(holes, cols) {
  const holeSet = new Set(holes);
  let clusterCount = 0;
  let maxClusterSize = 0;
  const visited = new Set();

  for (const hole of holes) {
    if (visited.has(hole)) continue;
    let clusterSize = 0;
    const stack = [hole];

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      clusterSize++;

      const r = Math.floor(current / cols);
      const c = current % cols;
      const neighbors = [
        r > 0 ? current - cols : -1,
        r < 10 ? current + cols : -1,
        c > 0 ? current - 1 : -1,
        c < cols - 1 ? current + 1 : -1
      ].filter(n => n >= 0 && holeSet.has(n) && !visited.has(n));

      for (const n of neighbors) {
        if (!visited.has(n)) stack.push(n);
      }
    }

    if (clusterSize > 0) clusterCount++;
    maxClusterSize = Math.max(maxClusterSize, clusterSize);
  }

  return { clusterCount, maxClusterSize };
}

console.log('=== 测试改进后的生成算法 ===\n');

console.log('--- Easy (6x6, 4-8 holes) ---');
for (let i = 0; i < 5; i++) {
  const result = generatePuzzle(6, 6, 4, 8);
  if (result) {
    const stats = checkClustering(result.holes, 6);
    console.log('Easy #' + (i+1) + ': holes=' + result.holes.length + ', clusters=' + stats.clusterCount + ', max=' + stats.maxClusterSize + ', answer=' + result.answer.length + ' steps');
    console.log(visualizeGrid(6, 6, result.holes));
  } else {
    console.log('Easy #' + (i+1) + ': FAILED');
  }
}