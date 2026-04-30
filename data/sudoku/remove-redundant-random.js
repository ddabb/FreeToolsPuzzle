/**
 * 数独题目随机去冗余
 * 对于每个冗余提示，有概率地决定是否移除
 * 保留一些冗余提示，让题目看起来更自然
 */

const fs = require('fs');
const path = require('path');

const SUDOKU_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sudoku';

// 移除概率（0.3 = 30%的冗余提示会被移除）
const REMOVE_PROBABILITY = 0.3;

// ============================================================
// DLX 求解器
// ============================================================

function Node() {
  this.u = this; this.d = this; this.l = this; this.r = this;
  this.col = -1; this.row = -1; this.c = null;
}

function createDLX() {
  const h = new Node();
  const col = new Array(324);
  let p = h;
  for (let i = 0; i < 324; i++) {
    const c = new Node();
    c.col = i; c.c = i;
    p.r = c; c.l = p;
    p = c;
    col[i] = c;
    c.u = c; c.d = c;
    c.sz = 0;
  }
  p.r = h; h.l = p;
  return { h, col };
}

function addRow(dlx, rowIdx, positions) {
  let first = null;
  for (const ci of positions) {
    const cn = dlx.col[ci];
    const n = new Node();
    n.row = rowIdx; n.col = ci; n.c = ci;
    n.d = cn; n.u = cn.u; cn.u.d = n; cn.u = n;
    cn.sz++;
    if (!first) {
      first = n; n.l = n; n.r = n;
    } else {
      n.r = first; n.l = first.l; first.l.r = n; first.l = n;
    }
  }
}

const C_ROW = 81;
const C_COL = 162;
const C_BOX = 243;

function colIdx(r, c, n) {
  const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  return [
    r * 9 + c,
    C_ROW + r * 9 + (n - 1),
    C_COL + c * 9 + (n - 1),
    C_BOX + b * 9 + (n - 1)
  ];
}

function cover(colNode, col) {
  colNode.r.l = colNode.l;
  colNode.l.r = colNode.r;
  for (let i = colNode.d; i !== colNode; i = i.d) {
    for (let j = i.r; j !== i; j = j.r) {
      j.d.u = j.u; j.u.d = j.d;
      col[j.col].sz--;
    }
  }
}

function uncover(colNode, col) {
  for (let i = colNode.u; i !== colNode; i = i.u) {
    for (let j = i.l; j !== i; j = j.l) {
      col[j.col].sz++;
      j.d.u = j; j.u.d = j;
    }
  }
  colNode.r.l = colNode;
  colNode.l.r = colNode;
}

function countSolutions(board, maxCount) {
  const dlx = createDLX();
  const { h, col } = dlx;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      for (let v = 1; v <= 9; v++) {
        addRow(dlx, r * 81 + c * 9 + (v - 1), colIdx(r, c, v));
      }
    }
  }

  const toCover = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      colIdx(r, c, v).forEach(ci => toCover.add(ci));
    }
  }
  [...toCover].sort((a, b) => a - b).forEach(ci => cover(col[ci], col));

  let count = 0;

  function search() {
    if (count >= maxCount) return;
    if (h.r === h) {
      count++;
      return;
    }
    let minC = null, minSz = Infinity;
    for (let c = h.r; c !== h; c = c.r) {
      if (c.sz < minSz) { minSz = c.sz; minC = c; }
    }
    if (minSz === 0) return;

    cover(minC, col);
    for (let rn = minC.d; rn !== minC && count < maxCount; rn = rn.d) {
      for (let j = rn.r; j !== rn; j = j.r) cover(col[j.col], col);
      search();
      for (let j = rn.l; j !== rn; j = j.l) uncover(col[j.col], col);
    }
    uncover(minC, col);
  }

  search();
  return count;
}

// ============================================================
// 随机去冗余
// ============================================================

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 检查是否冗余，并随机决定是否移除
function tryRemove(board, row, col, probability) {
  const backup = board[row][col];
  board[row][col] = 0;
  const solutions = countSolutions(board, 2);
  
  if (solutions === 1) {
    // 是冗余的，随机决定是否移除
    if (Math.random() < probability) {
      return true; // 移除
    } else {
      board[row][col] = backup; // 保留
      return false;
    }
  } else {
    // 不是冗余，恢复
    board[row][col] = backup;
    return false;
  }
}

// 随机去冗余处理
function removeRedundantRandom(puzzle, probability) {
  const board = puzzle.map(r => [...r]);
  
  // 收集所有提示数位置
  const hints = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) {
        hints.push({ r, c, v: board[r][c] });
      }
    }
  }
  
  // 随机顺序检查
  shuffle(hints);
  
  let removed = 0;
  let redundantButKept = 0;
  
  for (const hint of hints) {
    if (board[hint.r][hint.c] === 0) continue;
    
    const backup = board[hint.r][hint.c];
    board[hint.r][hint.c] = 0;
    const solutions = countSolutions(board, 2);
    
    if (solutions === 1) {
      // 冗余，随机决定
      if (Math.random() < probability) {
        removed++;
      } else {
        board[hint.r][hint.c] = backup;
        redundantButKept++;
      }
    } else {
      board[hint.r][hint.c] = backup;
    }
  }
  
  const remaining = hints.length - removed;
  return { board, removed, redundantButKept, remaining };
}

// 处理单个文件
function processFile(filePath, probability) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const originalHints = data.puzzle.flat().filter(v => v !== 0).length;
  
  const { board, removed, redundantButKept, remaining } = removeRedundantRandom(data.puzzle, probability);
  
  data.puzzle = board;
  data.emptyCells = 81 - remaining;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  return { original: originalHints, removed, redundantButKept, remaining };
}

// 主函数
async function main() {
  const files = fs.readdirSync(SUDOKU_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(SUDOKU_DIR, f));
  
  console.log(`共 ${files.length} 个文件`);
  console.log(`移除概率: ${REMOVE_PROBABILITY * 100}%\n`);
  
  let totalOriginal = 0;
  let totalRemoved = 0;
  let totalKept = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < files.length; i++) {
    const result = processFile(files[i], REMOVE_PROBABILITY);
    totalOriginal += result.original;
    totalRemoved += result.removed;
    totalKept += result.redundantButKept;
    
    if ((i + 1) % 200 === 0 || i === files.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${i + 1}/${files.length}] ${elapsed}s | 移除 ${totalRemoved} | 保留冗余 ${totalKept}`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n========================================`);
  console.log(`完成，耗时 ${elapsed}s`);
  console.log(`原始提示数: ${totalOriginal}`);
  console.log(`移除冗余: ${totalRemoved}`);
  console.log(`保留冗余: ${totalKept}`);
  console.log(`剩余提示: ${totalOriginal - totalRemoved}`);
  console.log(`========================================`);
}

main().catch(console.error);
