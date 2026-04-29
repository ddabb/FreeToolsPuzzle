/**
 * 最终正确构造方法
 * 确保所有格子都被照亮
 */

const fs = require('fs');
const path = require('path');

console.log('=== 构造正确谜题 ===\n');

// 策略：先确定灯塔位置，再添加不阻挡照亮的墙

// 步骤1: 确定灯塔位置
console.log('步骤1: 确定灯塔位置');
const lights = [
  [0, 0],
  [1, 2],
  [2, 4],
  [3, 1],
  [4, 3]
];
console.log('灯塔:', lights);

// 步骤2: 不添加墙，验证照亮
console.log('\n步骤2: 验证照亮（无墙）');
let grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

const size = grid.length;
const lit = new Set();

for (const [r, c] of lights) {
  for (let j = 0; j < size; j++) lit.add(`${r},${j}`);
  for (let i = 0; i < size; i++) lit.add(`${i},${c}`);
}

console.log('照亮的格子数:', lit.size, '/ 25');
console.log('所有格子照亮:', lit.size === 25);

// 步骤3: 添加数字墙（在灯塔周围，但不阻挡照亮）
console.log('\n步骤3: 添加数字墙');
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const lightSet = new Set(lights.map(([r, c]) => `${r},${c}`));

// 在灯塔周围添加数字墙
// 例如：在(0,1)位置，周围有灯塔(0,0)和(1,2)
// 但(1,2)不是相邻的，所以只有(0,0)是相邻的
// 所以(0,1)可以标注数字1

// 找到合适的位置添加数字墙
const wallCandidates = [];

for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === ' ' && !lightSet.has(`${r},${c}`)) {
      // 计算周围有多少灯塔
      let count = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (lightSet.has(`${nr},${nc}`)) count++;
        }
      }
      if (count > 0) {
        wallCandidates.push({ r, c, count });
      }
    }
  }
}

console.log('候选墙位置:');
wallCandidates.forEach(w => console.log(`  (${w.r},${w.c}) 周围${w.count}个灯塔`));

// 选择一些墙位置添加
const selectedWalls = [
  { r: 0, c: 1, count: 1 },  // 周围有(0,0)
  { r: 1, c: 3, count: 1 },  // 周围有(1,2)
  { r: 2, c: 3, count: 1 },  // 周围有(2,4)
  { r: 3, c: 0, count: 1 },  // 周围有(3,1)
  { r: 4, c: 2, count: 1 }   // 周围有(4,3)
];

for (const w of selectedWalls) {
  grid[w.r][w.c] = w.count;
}

console.log('\n添加数字墙后:');
console.log(printGrid(grid));

// 步骤4: 验证照亮情况
console.log('\n步骤4: 验证照亮情况');
lit.clear();
for (const [r, c] of lights) {
  // 照亮同行
  for (let j = c; j >= 0; j--) {
    if (grid[r][j] !== ' ') break;
    lit.add(`${r},${j}`);
  }
  for (let j = c; j < size; j++) {
    if (grid[r][j] !== ' ') break;
    lit.add(`${r},${j}`);
  }
  // 照亮同列
  for (let i = r; i >= 0; i--) {
    if (grid[i][c] !== ' ') break;
    lit.add(`${i},${c}`);
  }
  for (let i = r; i < size; i++) {
    if (grid[i][c] !== ' ') break;
    lit.add(`${i},${c}`);
  }
}

console.log('照亮的格子数:', lit.size);

// 检查未照亮的格子
const unlit = [];
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === ' ' && !lit.has(`${r},${c}`)) {
      unlit.push([r, c]);
    }
  }
}

if (unlit.length > 0) {
  console.log('未照亮的格子:', unlit);
  console.log('需要调整墙位置');
} else {
  console.log('所有格子照亮！');

  // 写入文件
  const puzzle = {
    size: 5,
    grid: grid,
    answer: lights
  };

  const filepath = path.join(__dirname, 'correct-001.json');
  fs.writeFileSync(filepath, JSON.stringify(puzzle, null, 2));
  console.log('\n写入文件:', filepath);
}

// 辅助函数
function printGrid(grid) {
  return grid.map(row => row.map(c => {
    if (c === ' ') return '.';
    return c;
  }).join(' ')).join('\n');
}