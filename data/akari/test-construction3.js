/**
 * 完全正确的构造方法
 *
 * Akari规则：
 * 1. 数字墙：数字表示周围恰好N个灯塔
 *    - 数字0：周围不能有灯塔
 *    - 数字1-4：周围恰好N个灯塔
 * 2. 灯塔不能互相照射（同行同列必须中间有墙）
 * 3. 所有空格必须被照亮
 */

const fs = require('fs');
const path = require('path');

console.log('=== 构造一个简单正确的5x5谜题 ===\n');

// 策略：先确定灯塔位置，再添加墙和数字约束

// 步骤1: 确定灯塔位置（每行一个，错开列，确保同行同列不冲突）
console.log('步骤1: 确定灯塔位置');
const lights = [
  [0, 0],
  [1, 2],
  [2, 4],
  [3, 1],
  [4, 3]
];
console.log('灯塔:', lights);

// 检查是否有同行同列的灯塔
const rows = lights.map(([r, c]) => r);
const cols = lights.map(([r, c]) => c);
console.log('行:', rows, '是否有重复:', new Set(rows).size !== rows.length);
console.log('列:', cols, '是否有重复:', new Set(cols).size !== cols.length);

// 因为所有灯塔都在不同的行和列，所以不会冲突！
// 不需要添加分隔墙

// 步骤2: 添加墙（可选，用于增加难度）
console.log('\n步骤2: 添加墙');
let grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

// 不添加墙，保持简单

// 步骤3: 验证所有格子被照亮
console.log('\n步骤3: 验证所有格子被照亮');
const size = grid.length;
const lit = new Set();

for (const [r, c] of lights) {
  // 照亮同行
  for (let j = 0; j < size; j++) {
    if (grid[r][j] === ' ') lit.add(`${r},${j}`);
  }
  // 照亮同列
  for (let i = 0; i < size; i++) {
    if (grid[i][c] === ' ') lit.add(`${i},${c}`);
  }
}

console.log('照亮的格子数:', lit.size, '/ 总空格数:', size * size);

// 步骤4: 添加数字墙（在灯塔周围）
console.log('\n步骤4: 添加数字墙');
// 在某些灯塔周围添加墙，并标注数字

// 灯塔(0,0)周围没有灯塔（其他灯塔都在不同行不同列）
// 可以在(1,1)放一个数字1墙，表示周围有1个灯塔(0,0)或(3,1)
// 但(3,1)离(1,1)太远

// 更简单的做法：不添加数字墙，只有空格和灯塔
// 这样谜题太简单，但至少是正确的

// 或者：添加一些墙，但不标注数字
grid = [
  [' ', ' ', ' ', '#', ' '],
  ['#', ' ', ' ', ' ', ' '],
  [' ', '#', ' ', ' ', ' '],
  [' ', ' ', ' ', '#', ' '],
  [' ', ' ', ' ', ' ', '#']
];

console.log('添加墙后:');
console.log(printGrid(grid));

// 重新验证照亮情况
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
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === ' ' && !lit.has(`${r},${c}`)) {
      console.log(`未照亮: (${r},${c})`);
    }
  }
}

// 步骤5: 添加数字约束（选择合适的位置）
console.log('\n步骤5: 添加数字约束');
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const lightSet = new Set(lights.map(([r, c]) => `${r},${c}`));

// 找到周围有恰好1个灯塔的墙位置
console.log('检查哪些墙可以标注数字:');
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === '#') {
      let count = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (lightSet.has(`${nr},${nc}`)) count++;
        }
      }
      console.log(`  (${r},${c}) 周围灯塔数: ${count}`);
      if (count >= 0 && count <= 4) {
        grid[r][c] = count; // 标注数字
      }
    }
  }
}

console.log('\n最终谜题:');
console.log(printGrid(grid));
console.log('灯塔:', lights);

// 写入文件
const puzzle = {
  size: 5,
  grid: grid,
  answer: lights
};

const filepath = path.join(__dirname, 'manual-test-001.json');
fs.writeFileSync(filepath, JSON.stringify(puzzle, null, 2));
console.log('\n写入文件:', filepath);

// 辅助函数
function printGrid(grid) {
  return grid.map(row => row.map(c => {
    if (c === ' ') return '.';
    if (c === '#') return '#';
    return c;
  }).join(' ')).join('\n');
}