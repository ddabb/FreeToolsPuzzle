/**
 * 输出题目答案
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

function readPuzzle(difficulty, index) {
  const filename = `${difficulty}-${index.toString().padStart(4, '0')}.json`;
  const filepath = pathModule.join(OUTPUT_DIR, difficulty, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

function findPath(lines, size) {
  const visited = new Set();
  let startR = -1, startC = -1;

  for (let r = 0; r < size && startR === -1; r++) {
    for (let c = 0; c < size && startR === -1; c++) {
      const l = lines[r][c];
      const deg = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
      if (deg === 2) {
        startR = r;
        startC = c;
      }
    }
  }

  if (startR === -1) return [];

  const path = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  let cr = startR, cc = startC;
  let prevR = -1, prevC = -1;

  while (true) {
    const currL = lines[cr][cc];
    const nextCells = [];

    if (currL.top && !(prevR === cr - 1 && prevC === cc)) {
      nextCells.push([cr - 1, cc, 'top']);
    }
    if (currL.bottom && !(prevR === cr + 1 && prevC === cc)) {
      nextCells.push([cr + 1, cc, 'bottom']);
    }
    if (currL.left && !(prevR === cr && prevC === cc - 1)) {
      nextCells.push([cr, cc - 1, 'left']);
    }
    if (currL.right && !(prevR === cr && prevC === cc + 1)) {
      nextCells.push([cr, cc + 1, 'right']);
    }

    if (nextCells.length === 0) break;

    const [nr, nc] = nextCells[0];

    if (nr === startR && nc === startC) break;
    if (visited.has(`${nr},${nc}`)) break;

    path.push([nr, nc]);
    visited.add(`${nr},${nc}`);
    prevR = cr;
    prevC = cc;
    cr = nr;
    cc = nc;

    if (path.length === size * size) break;
  }

  return path;
}

function printPuzzle(puzzle) {
  const { id, difficulty, size, grid, lines, pearlCount, blackCount, whiteCount } = puzzle;
  const path = findPath(lines, size);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`题目 #${id} (${difficulty}, ${size}x${size})`);
  console.log(`珍珠: ${pearlCount}个 (黑${blackCount}, 白${whiteCount})`);
  console.log('='.repeat(60));

  console.log('\n【格子状态】(0=空, 1=黑珍珠, 2=白珍珠)');
  for (let r = 0; r < size; r++) {
    const row = grid[r].map(v => v === 0 ? '·' : (v === 1 ? '●' : '○')).join(' ');
    console.log(`  ${row}`);
  }

  console.log('\n【回路路径】');
  console.log(`  起点: (${path[0][0]}, ${path[0][1]})`);
  console.log(`  总步数: ${path.length}/${size * size}`);

  if (path.length > 0) {
    console.log(`  终点: (${path[path.length-1][0]}, ${path[path.length-1][1]})`);
  }

  console.log('\n【路径坐标序列】');
  if (path.length <= 20) {
    const pathStr = path.map(([r, c]) => `(${r},${c})`).join(' → ');
    console.log(`  ${pathStr}`);
  } else {
    const pathStr1 = path.slice(0, 10).map(([r, c]) => `(${r},${c})`).join(' → ');
    const pathStr2 = path.slice(-10).map(([r, c]) => `(${r},${c})`).join(' → ');
    console.log(`  ${pathStr1}`);
    console.log(`  ... → ...`);
    console.log(`  ${pathStr2}`);
  }

  console.log('\n【路径可视化】');
  const grid2 = Array.from({ length: size }, () => Array(size).fill('·'));
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    grid2[r][c] = (i % 10).toString();
  }
  for (let r = 0; r < size; r++) {
    console.log(`  ${grid2[r].join(' ')}`);
  }

  console.log('\n【珍珠位置验证】');
  let valid = true;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) {
        const l = lines[r][c];
        const isStraight = (l.top && l.bottom) || (l.left && l.right);
        const type = grid[r][c] === 1 ? '黑●' : '白○';
        const pos = isStraight ? '直线' : '拐角';
        const ok = isStraight === (grid[r][c] === 2);
        if (!ok) valid = false;
        console.log(`  (${r},${c}): ${type} 在${pos} - ${ok ? '✓' : '✗'}`);
      }
    }
  }

  if (valid) {
    console.log('\n  ✓ 所有珍珠位置正确！');
  } else {
    console.log('\n  ✗ 存在珍珠位置错误！');
  }
}

const puzzles = [
  { difficulty: 'easy', index: 1 },
  { difficulty: 'easy', index: 5 },
  { difficulty: 'medium', index: 1 },
  { difficulty: 'medium', index: 10 },
  { difficulty: 'hard', index: 1 },
  { difficulty: 'hard', index: 100 }
];

console.log('珍珠游戏答案输出\n');

for (const { difficulty, index } of puzzles) {
  try {
    const puzzle = readPuzzle(difficulty, index);
    printPuzzle(puzzle);
  } catch (err) {
    console.log(`读取 ${difficulty}-${index} 失败: ${err.message}`);
  }
}
