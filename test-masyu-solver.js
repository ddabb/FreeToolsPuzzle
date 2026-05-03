// 测试 Masyu 求解器
const fs = require('fs');
const path = require('path');
const { countSolutions } = require('./data/validators/masyu');

const CELL_EMPTY = 0;
const CELL_WHITE = 1;
const CELL_BLACK = 2;

// 测试1：简单题目
function test1() {
  const size = 6;
  const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  
  // 在 (1,1) 放黑珍珠，(1,3) 放白珍珠
  grid[1][1] = CELL_BLACK;
  grid[1][3] = CELL_WHITE;
  
  console.log('测试1: 简单珍珠布局');
  console.log(grid.map(r => r.map(c => c === 1 ? 'W' : c === 2 ? 'B' : '.').join(' ')).join('\n'));
  
  const start = Date.now();
  const count = countSolutions(grid, size, 5);
  const elapsed = Date.now() - start;
  console.log(`解的数量: ${count} (${elapsed}ms)\n`);
}

// 测试2：检查现有题目
function test2() {
  const sampleFile = path.join(__dirname, 'data', 'masyu', 'easy', 'easy-0001.json');
  const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
  
  console.log('测试2: 现有题目 easy-0001.json');
  console.log('网格大小:', sample.size);
  
  const start = Date.now();
  const count = countSolutions(sample.grid, sample.size, 5);
  const elapsed = Date.now() - start;
  console.log(`解的数量: ${count} (${elapsed}ms)\n`);
}

test1();
test2();
