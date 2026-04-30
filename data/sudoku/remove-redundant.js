/**
 * 数独题目去冗余
 * 移除所有可以被推导出来的提示数，保留最少的必要提示
 */

const fs = require('fs');
const path = require('path');

const SUDOKU_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sudoku';

// ============================================================
// DLX（Dancing Links X）求解数独 - 用于验证唯一解
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

  const selected = [];
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
      selected.push(rn);
      for (let j = rn.r; j !== rn; j = j.r) cover(col[j.col], col);
      search();
      for (let j = rn.l; j !== rn; j = j.l) uncover(col[j.col], col);
      selected.pop();
    }
    uncover(minC, col);
  }

  search();
  return count;
}

// ============================================================
// 去冗余主逻辑
// ============================================================

// Fisher-Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 检查某个提示数是否冗余
function isRedundant(board, row, col) {
  const backup = board[row][col];
  board[row][col] = 0;
  const solutions = countSolutions(board, 2);
  if (solutions === 1) {
    // 移除后仍有唯一解，说明冗余
    return true;
  } else {
    // 移除后无解或多解，恢复
    board[row][col] = backup;
    return false;
  }
}

// 去冗余处理单个题目
function removeRedundant(puzzle) {
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
  
  // 随机顺序检查，避免总是保留相同位置的提示
  shuffle(hints);
  
  let removed = 0;
  for (const hint of hints) {
    if (board[hint.r][hint.c] === 0) continue; // 已被移除
    if (isRedundant(board, hint.r, hint.c)) {
      removed++;
    }
  }
  
  return { board, removed, remaining: hints.length - removed };
}

// 处理单个文件
function processFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const originalHints = data.puzzle.flat().filter(v => v !== 0).length;
  
  const { board, removed, remaining } = removeRedundant(data.puzzle);
  
  data.puzzle = board;
  data.emptyCells = 81 - remaining;
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  
  return {
    file: path.basename(filePath),
    original: originalHints,
    removed,
    remaining,
    emptyCells: data.emptyCells,
    difficulty: data.difficulty
  };
}

// 主函数
async function main() {
  const files = fs.readdirSync(SUDOKU_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(SUDOKU_DIR, f));
  
  console.log(`共 ${files.length} 个文件待处理\n`);
  
  let totalOriginal = 0;
  let totalRemoved = 0;
  let totalRemaining = 0;
  
  const startTime = Date.now();
  
  for (let i = 0; i < files.length; i++) {
    const result = processFile(files[i]);
    totalOriginal += result.original;
    totalRemoved += result.removed;
    totalRemaining += result.remaining;
    
    if ((i + 1) % 100 === 0 || i === files.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${i + 1}/${files.length}] 已处理 ${elapsed}s, 累计移除 ${totalRemoved} 个冗余提示`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log(`\n========================================`);
  console.log(`处理完成，耗时 ${elapsed}s`);
  console.log(`原始提示数: ${totalOriginal}`);
  console.log(`移除冗余: ${totalRemoved}`);
  console.log(`剩余提示: ${totalRemaining}`);
  console.log(`平均每题移除: ${(totalRemoved / files.length).toFixed(1)} 个`);
  console.log(`========================================`);
}

main().catch(console.error);
