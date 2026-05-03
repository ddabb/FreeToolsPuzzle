const fs = require('fs');
const path = require('path');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const DATA_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

function validatePuzzle(puzzle) {
  const { size, grid, lines } = puzzle;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      
      const edgeCount = (cell.top ? 1 : 0) + (cell.right ? 1 : 0) + (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0);
      
      if (edgeCount !== 0 && edgeCount !== 2) {
        return { valid: false, reason: `格子(${r},${c})的边数是${edgeCount}，不是0或2` };
      }
      
      if (grid[r][c] === BLACK && isStraight) {
        return { valid: false, reason: `黑珍珠(${r},${c})在直线上` };
      }
      if (grid[r][c] === WHITE && !isStraight) {
        return { valid: false, reason: `白珍珠(${r},${c})在拐角上` };
      }
    }
  }

  let hasEdge = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lines[r][c].top || lines[r][c].right || lines[r][c].bottom || lines[r][c].left) {
        hasEdge = true;
        break;
      }
    }
    if (hasEdge) break;
  }
  if (!hasEdge) {
    return { valid: false, reason: '没有任何连线' };
  }

  let startR = -1, startC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lines[r][c].top || lines[r][c].right || lines[r][c].bottom || lines[r][c].left) {
        startR = r;
        startC = c;
        break;
      }
    }
    if (startR !== -1) break;
  }

  const visited = new Set();
  let currentR = startR, currentC = startC, prevDir = -1, steps = 0;

  while (steps < size * size * 2) {
    const key = `${currentR},${currentC}`;
    if (visited.has(key)) {
      if (currentR === startR && currentC === startC && steps >= size * size) {
        break;
      }
      return { valid: false, reason: '重复访问但没有回到起点' };
    }
    visited.add(key);

    const dirs = [];
    const cell = lines[currentR][currentC];
    if (prevDir !== 0 && cell.top) dirs.push(0);
    if (prevDir !== 1 && cell.right) dirs.push(1);
    if (prevDir !== 2 && cell.bottom) dirs.push(2);
    if (prevDir !== 3 && cell.left) dirs.push(3);

    if (dirs.length === 0) {
      return { valid: false, reason: `(${currentR},${currentC})无路可走` };
    }
    if (dirs.length !== 1) {
      return { valid: false, reason: `(${currentR},${currentC})有${dirs.length}个方向可选` };
    }

    const dir = dirs[0];
    let nextR = currentR, nextC = currentC;
    switch (dir) {
      case 0: nextR = currentR - 1; break;
      case 1: nextC = currentC + 1; break;
      case 2: nextR = currentR + 1; break;
      case 3: nextC = currentC - 1; break;
    }

    if (nextR < 0 || nextR >= size || nextC < 0 || nextC >= size) {
      return { valid: false, reason: '越界了' };
    }

    currentR = nextR;
    currentC = nextC;
    prevDir = [2, 3, 0, 1][dir];
    steps++;
  }

  if (currentR !== startR || currentC !== startC) {
    return { valid: false, reason: '没有形成闭合回路' };
  }

  return { valid: true };
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];

let totalValid = 0, totalInvalid = 0;
const startTime = Date.now();

for (const diff of DIFFICULTIES) {
  const dir = path.join(DATA_DIR, diff);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log(`\n=== 验证 ${diff} 难度的 ${files.length} 个题目 ===`);

  let valid = 0, invalid = 0;
  for (let i = 0; i < Math.min(files.length, 100); i++) {
    const file = files[i];
    try {
      const puzzle = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const result = validatePuzzle(puzzle);
      if (result.valid) {
        valid++;
      } else {
        invalid++;
        console.log(`  ${file}: ${result.reason}`);
      }
    } catch (e) {
      invalid++;
      console.log(`  ${file}: 解析错误 - ${e.message}`);
    }
  }

  totalValid += valid;
  totalInvalid += invalid;

  console.log(`${diff}: 有效 ${valid} / 100`);
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n总计: 有效 ${totalValid}, 无效 ${totalInvalid}, 耗时 ${totalTime}s`);
