const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'one-stroke');
const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 4, maxHoles: 6 },
  medium: { rows: 8, cols: 8, minHoles: 10, maxHoles: 13 },
  hard: { rows: 10, cols: 10, minHoles: 15, maxHoles: 18 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');
const MAX_START_ATTEMPTS = 100;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNeighbors(cur, rows, cols, visited) {
  const r = Math.floor(cur / cols);
  const c = cur % cols;
  const neighbors = [];

  if (r > 0 && !visited[cur - cols]) neighbors.push(cur - cols);
  if (r < rows - 1 && !visited[cur + cols]) neighbors.push(cur + cols);
  if (c > 0 && !visited[cur - 1]) neighbors.push(cur - 1);
  if (c < cols - 1 && !visited[cur + 1]) neighbors.push(cur + 1);

  return neighbors;
}

function countNeighbors(cell, rows, cols, visited) {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  let count = 0;

  if (r > 0 && !visited[cell - cols]) count++;
  if (r < rows - 1 && !visited[cell + cols]) count++;
  if (c > 0 && !visited[cell - 1]) count++;
  if (c < cols - 1 && !visited[cell + 1]) count++;

  return count;
}

function warnsdorffWalk(rows, cols, start) {
  const total = rows * cols;
  const visited = new Uint8Array(total);
  const path = [];
  
  visited[start] = 1;
  path.push(start);
  
  let current = start;
  
  while (true) {
    const neighbors = getNeighbors(current, rows, cols, visited);
    if (neighbors.length === 0) break;
    
    neighbors.sort((a, b) => countNeighbors(a, rows, cols, visited) - countNeighbors(b, rows, cols, visited));
    const candidates = neighbors.filter(n => countNeighbors(n, rows, cols, visited) === countNeighbors(neighbors[0], rows, cols, visited));
    shuffle(candidates);
    
    current = candidates[0];
    visited[current] = 1;
    path.push(current);
  }
  
  return { path, visited };
}

function generateWalkAndDig(rows, cols, minHoles, maxHoles) {
  const total = rows * cols;

  for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt++) {
    const start = Math.floor(Math.random() * total);
    const { path } = warnsdorffWalk(rows, cols, start);
    
    const holes = [];
    const pathSet = new Set(path);
    for (let i = 0; i < total; i++) {
      if (!pathSet.has(i)) holes.push(i);
    }
    
    if (holes.length >= minHoles && holes.length <= maxHoles) {
      return { holes, answer: path };
    }
  }

  const start = Math.floor(Math.random() * total);
  const { path } = warnsdorffWalk(rows, cols, start);
  const holes = [];
  const pathSet = new Set(path);
  for (let i = 0; i < total; i++) {
    if (!pathSet.has(i)) holes.push(i);
  }

  return { holes, answer: path };
}

function validatePath(rows, cols, holes, answer) {
  const total = rows * cols;
  const holeSet = new Set(holes);
  const validCount = total - holes.length;

  if (answer.length !== validCount) return false;

  const visited = new Set();
  
  for (let i = 0; i < answer.length; i++) {
    const cell = answer[i];
    
    if (visited.has(cell)) return false;
    if (holeSet.has(cell)) return false;
    
    visited.add(cell);
    
    if (i > 0) {
      const prev = answer[i - 1];
      const prevR = Math.floor(prev / cols);
      const prevC = prev % cols;
      const currR = Math.floor(cell / cols);
      const currC = cell % cols;
      
      const dr = Math.abs(prevR - currR);
      const dc = Math.abs(prevC - currC);
      
      if (dr + dc !== 1) return false;
    }
  }

  return visited.size === validCount;
}

function regenerateInvalid() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  const invalidFiles = [
    'hard-0705.json'
  ];

  console.log(`重新生成 ${invalidFiles.length} 个无效题目...\n`);

  for (const filename of invalidFiles) {
    const filepath = path.join(INPUT_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);
    
    const config = DIFFICULTIES[data.difficulty];
    let puzzle = null;
    
    for (let attempt = 0; attempt < 1000; attempt++) {
      puzzle = generateWalkAndDig(config.rows, config.cols, config.minHoles, config.maxHoles);
      
      if (puzzle && validatePath(config.rows, config.cols, puzzle.holes, puzzle.answer)) {
        break;
      }
    }

    if (puzzle) {
      const newData = {
        size: config.rows,
        row: config.rows,
        col: config.cols,
        holes: puzzle.holes.sort((a, b) => a - b),
        answer: puzzle.answer,
        difficulty: data.difficulty,
        id: data.id
      };
      
      fs.writeFileSync(filepath, JSON.stringify(newData, null, 2));
      console.log(`✅ 重新生成: ${filename}`);
    } else {
      console.log(`❌ 无法重新生成: ${filename}`);
    }
  }

  console.log('\n完成！');
}

regenerateInvalid();