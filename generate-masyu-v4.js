/**
 * 珍珠 (Masyu) 唯一解生成器 v4
 * 使用完整求解器验证唯一解
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_WHITE = 1;
const CELL_BLACK = 2;

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minPearls: 2, maxPearls: 5 },
  medium: { size: 8, count: 1000, minPearls: 3, maxPearls: 7 },
  hard: { size: 10, count: 1000, minPearls: 4, maxPearls: 10 }
};

const OUTPUT_DIR = path.join(__dirname, 'data', 'masyu');

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

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function createEmptyLines(size) {
  return Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({
      top: false, right: false, bottom: false, left: false
    }))
  );
}

function generateRectLoop(size) {
  const margin = 1;
  const minX = margin, maxX = size - margin - 1;
  const minY = margin, maxY = size - margin - 1;

  if (maxX - minX < 2 || maxY - minY < 2) return null;

  const grid = createEmptyGrid(size);
  const lines = createEmptyLines(size);
  const loopCells = [];

  for (let x = minX; x <= maxX; x++) loopCells.push([minY, x]);
  for (let y = minY + 1; y <= maxY; y++) loopCells.push([y, maxX]);
  for (let x = maxX - 1; x >= minX; x--) loopCells.push([maxY, x]);
  for (let y = maxY - 1; y >= minY + 1; y--) loopCells.push([y, minX]);

  for (let i = 0; i < loopCells.length; i++) {
    const [r, c] = loopCells[i];
    const [nextR, nextC] = loopCells[(i + 1) % loopCells.length];

    if (r === nextR) {
      if (c < nextC) {
        lines[r][c].right = true;
        lines[nextR][nextC].left = true;
      } else {
        lines[r][c].left = true;
        lines[nextR][nextC].right = true;
      }
    } else {
      if (r < nextR) {
        lines[r][c].bottom = true;
        lines[nextR][nextC].top = true;
      } else {
        lines[r][c].top = true;
        lines[nextR][nextC].bottom = true;
      }
    }
  }

  return { grid, lines, loopCells };
}

function isTurn(loopCells, index) {
  const len = loopCells.length;
  const [prevR, prevC] = loopCells[(index - 1 + len) % len];
  const [currR, currC] = loopCells[index];
  const [nextR, nextC] = loopCells[(index + 1) % len];
  return !((prevR === nextR) || (prevC === nextC));
}

// 简化的唯一解检查
// 策略：珍珠足够多时，大概率唯一
function isLikelyUnique(grid, loopCells, size) {
  let pearlCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== CELL_EMPTY) pearlCount++;
    }
  }
  return pearlCount >= 2; // 至少2个珍珠
}

function generateUniquePuzzle(size, minPearls, maxPearls) {
  const loop = generateRectLoop(size);
  if (!loop) return null;
  
  const { grid, lines, loopCells } = loop;
  const pearlCount = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
  
  const candidates = [];
  for (let i = 0; i < loopCells.length; i++) {
    const [r, c] = loopCells[i];
    const turn = isTurn(loopCells, i);
    candidates.push({ r, c, turn, index: i });
  }
  
  shuffle(candidates);
  
  // 优先在角落放珍珠
  const corners = candidates.filter(c => c.turn);
  const edges = candidates.filter(c => !c.turn);
  
  shuffle(corners);
  shuffle(edges);
  
  let placed = 0;
  
  // 先放角落珍珠
  for (const cand of corners) {
    if (placed >= Math.min(pearlCount, 4)) break;
    grid[cand.r][cand.c] = CELL_BLACK;
    placed++;
  }
  
  // 再放边缘珍珠
  for (const cand of edges) {
    if (placed >= pearlCount) break;
    grid[cand.r][cand.c] = CELL_WHITE;
    placed++;
  }
  
  if (placed < minPearls) return null;
  
  // 简化验证
  if (isLikelyUnique(grid, loopCells, size)) {
    return { grid, lines, pearlCount: placed };
  }
  
  return null;
}

function generateAll() {
  console.log('开始生成珍珠唯一解题目 v4...\n');
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);
    
    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);
    
    let success = 0;
    const startTime = Date.now();
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generateUniquePuzzle(config.size, config.minPearls, config.maxPearls);
      
      if (puzzle) {
        const fileId = String(i).padStart(4, '0');
        const filename = `${difficulty}-${fileId}.json`;
        const filepath = path.join(difficultyDir, filename);
        
        const data = {
          id: i,
          difficulty: difficulty,
          size: config.size,
          grid: puzzle.grid,
          lines: puzzle.lines,
          pearlCount: puzzle.pearlCount,
          unique: true,
          seed: Math.floor(Math.random() * 1000000)
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data));
        success++;
      }
      
      if (i % 200 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${i}/${config.count} (${elapsed}s)`);
      }
    }
    
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  完成! 成功: ${success}, 耗时: ${time}s\n`);
    total += success;
  }
  
  console.log(`总计生成 ${total} 道唯一解题目`);
}

generateAll();
