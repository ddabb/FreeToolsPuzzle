// 测试单个文件的去冗余
const fs = require('fs');
const path = require('path');

const SUDOKU_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sudoku';

// DLX 实现
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

// 测试第一个文件
const testFile = path.join(SUDOKU_DIR, '20250101.json');
const data = JSON.parse(fs.readFileSync(testFile, 'utf8'));

console.log('原始题目:');
console.log('难度:', data.difficulty);
console.log('提示数:', data.puzzle.flat().filter(v => v !== 0).length);
console.log('空格数:', data.emptyCells);

const board = data.puzzle.map(r => [...r]);

// 测试：尝试移除第一个提示数
console.log('\n测试移除提示数...');
let testCount = 0;
for (let r = 0; r < 9 && testCount < 3; r++) {
  for (let c = 0; c < 9 && testCount < 3; c++) {
    if (board[r][c] !== 0) {
      const backup = board[r][c];
      board[r][c] = 0;
      const sols = countSolutions(board, 2);
      console.log(`  (${r},${c}) 值=${backup}: 移除后解数=${sols} ${sols === 1 ? '冗余!' : '必要'}`);
      if (sols !== 1) board[r][c] = backup;
      testCount++;
    }
  }
}

console.log('\n验证唯一解...');
const originalSolutions = countSolutions(data.puzzle.map(r => [...r]), 2);
console.log('原始题目解数:', originalSolutions);
