/**
 * ============================================================================
 * 一笔画（One-Stroke）题目批量生成器
 * ============================================================================
 *
 * 算法思路（用户原始思路）：
 * 1. 从随机起点开始，用 Warnsdorff 启发式走到走不动
 * 2. 走过的格子 = 路径（答案）
 * 3. 没走过的格子 = 洞
 * 4. 路径本身就是有效答案，天然保证有解
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 4, maxHoles: 6, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 10, maxHoles: 13, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 15, maxHoles: 18, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');
const MAX_START_ATTEMPTS = 100;

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

function getNeighbors(cur, rows, cols, visited) {
  const r = Math.floor(cur / cols);
  const c = cur % cols;
  const neighbors = [];

  if (r > 0) {
    const up = cur - cols;
    if (!visited[up]) neighbors.push(up);
  }
  if (r < rows - 1) {
    const down = cur + cols;
    if (!visited[down]) neighbors.push(down);
  }
  if (c > 0) {
    const left = cur - 1;
    if (!visited[left]) neighbors.push(left);
  }
  if (c < cols - 1) {
    const right = cur + 1;
    if (!visited[right]) neighbors.push(right);
  }

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

    if (visited[current]) break;

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
      if (!pathSet.has(i)) {
        holes.push(i);
      }
    }
    
    if (holes.length >= minHoles && holes.length <= maxHoles) {
      return { rows, cols, holes, answer: path };
    }
  }

  const start = Math.floor(Math.random() * total);
  const { path } = warnsdorffWalk(rows, cols, start);

  const holes = [];
  const pathSet = new Set(path);
  for (let i = 0; i < total; i++) {
    if (!pathSet.has(i)) {
      holes.push(i);
    }
  }

  return { rows, cols, holes, answer: path };
}

function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { holes, answer } = generateWalkAndDig(rows, cols, minHoles, maxHoles);

    if (holes.length >= minHoles && holes.length <= maxHoles && answer.length >= 2) {
      return { holes, answer, row: rows, col: cols };
    }
  }

  return null;
}

function generateAll() {
  console.log('开始生成 one-stroke 题目...\n');

  ensureDir(OUTPUT_DIR);

  let total = 0;
  let totalTime = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    console.log(`生成 ${difficulty} 难度 (${config.rows}x${config.cols}, ${config.minHoles}-${config.maxHoles}洞)...`);

    let success = 0;
    let fail = 0;
    let difficultyTime = 0;

    for (let i = 1; i <= config.count; i++) {
      const startTime = Date.now();

      const puzzle = generatePuzzle(config.rows, config.cols, config.minHoles, config.maxHoles);

      const endTime = Date.now();
      difficultyTime += (endTime - startTime);

      if (puzzle && puzzle.holes && puzzle.answer) {
        const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const data = {
          size: config.rows,
          row: puzzle.row,
          col: puzzle.col,
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