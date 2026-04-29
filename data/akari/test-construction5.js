/**
 * 更保守的策略：只在灯塔附近不影响照明的位置放墙
 */

const fs = require('fs');
const path = require('path');

console.log('=== 保守策略构造谜题 ===\n');

// 步骤1: 灯塔位置
const lights = [
  [0, 0],
  [1, 2],
  [2, 4],
  [3, 1],
  [4, 3]
];
console.log('灯塔:', lights);

// 步骤2: 不放任何墙，纯空格
console.log('\n步骤2: 空板');
let grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

// 步骤3: 在灯塔位置放墙（数字约束）
// 灯塔位置本身不能是墙，所以这个方法不适用

// 换个思路：不放任何数字墙，只有灯塔和空格
// 这是一个最简单的谜题

console.log('最简单谜题（无数字墙）:');
console.log(printGrid(grid));

// 验证照亮
const size = grid.length;
const lit = new Set();
for (const [r, c] of lights) {
  for (let j = 0; j < size; j++) lit.add(`${r},${j}`);
  for (let i = 0; i < size; i++) lit.add(`${i},${c}`);
}
console.log('照亮格子:', lit.size);

// 检查灯塔冲突
const lightSet = new Set(lights.map(([r, c]) => `${r},${c}`));
let conflict = false;
for (let i = 0; i < lights.length; i++) {
  for (let j = i + 1; j < lights.length; j++) {
    const [r1, c1] = lights[i];
    const [r2, c2] = lights[j];
    if (r1 === r2 || c1 === c2) {
      conflict = true;
      console.log('冲突:', lights[i], lights[j]);
    }
  }
}
console.log('灯塔冲突:', conflict ? '有' : '无');

// 这个谜题太简单（没有数字墙约束），玩家一眼就能看出答案
// 需要添加一些墙来隐藏答案

// 步骤4: 添加墙来隐藏答案，但不改变照明
console.log('\n步骤4: 添加墙来隐藏答案');

// 策略：把灯塔位置改成数字墙
// 例如：(0,0)本来是灯塔，改成数字墙
// 然后玩家需要推断灯塔应该在周围

// 不对，这样改变了答案

// 正确的策略：
// 1. 灯塔位置不变
// 2. 添加一些墙来增加约束
// 3. 确保墙不阻挡照明

// 关键：墙应该放在灯塔照射的"盲区"
// 灯塔(0,0)照射：第0行全亮，第0列全亮
// 所以盲区是：所有其他格子...不对，都被其他灯塔照亮了

// 这个谜题的答案太简单，因为5个灯塔照亮了所有格子
// 需要减少灯塔数量，增加难度

console.log('\n=== 重新设计：减少灯塔数量 ===');

// 新策略：用更少的灯塔照亮所有格子
// 这需要添加墙来帮助照亮

// 例如：3个灯塔可能照亮所有格子吗？
// 在5x5板上，如果灯塔放在角落，每个灯塔照亮9个格子
// 3个灯塔最多照亮27个格子，但有重叠
// 所以3个灯塔可以照亮所有25个格子

// 设计：3个灯塔
const lights3 = [
  [0, 2],  // 照亮第0行和第2列（共9个）
  [2, 0],  // 照亮第2行和第0列（共9个，但(0,0),(2,2)重叠）
  [4, 4]   // 照亮第4行和第4列（共9个，但重叠）
];

// 验证照亮
lit.clear();
for (const [r, c] of lights3) {
  for (let j = 0; j < size; j++) lit.add(`${r},${j}`);
  for (let i = 0; i < size; i++) lit.add(`${i},${c}`);
}
console.log('灯塔:', lights3);
console.log('照亮格子:', lit.size);

if (lit.size < 25) {
  console.log('未照亮格子:');
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!lit.has(`${r},${c}`)) {
        console.log(`  (${r},${c})`);
      }
    }
  }
}

// 需要更多灯塔来照亮剩余格子
// 让我用4个灯塔
const lights4 = [
  [0, 2],  // 照亮第0行和第2列
  [2, 0],  // 照亮第2行和第0列
  [4, 2],  // 照亮第4行和第2列
  [2, 4]   // 照亮第2行和第4列
];

// 检查冲突
// (0,2)和(2,0)不在同行同列，OK
// (0,2)和(4,2)同列！需要墙分隔
// (0,2)和(2,4)不同行不同列，OK
// (2,0)和(4,2)不同行不同列，OK
// (2,0)和(2,4)同行！需要墙分隔
// (4,2)和(2,4)不同行不同列，OK

console.log('\n灯塔:', lights4);
console.log('冲突检查:');
for (let i = 0; i < lights4.length; i++) {
  for (let j = i + 1; j < lights4.length; j++) {
    const [r1, c1] = lights4[i];
    const [r2, c2] = lights4[j];
    if (r1 === r2) {
      console.log(`  (${r1},${c1}) 和 (${r2},${c2}) 同行`);
    }
    if (c1 === c2) {
      console.log(`  (${r1},${c1}) 和 (${r2},${c2}) 同列`);
    }
  }
}

// 需要添加墙来分隔冲突的灯塔
// (0,2)和(4,2)同列，中间需要墙
// (2,0)和(2,4)同行，中间需要墙

grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', '#', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', '#', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

// 在第2列的(1,2)和(3,2)放墙，分隔(0,2)和(4,2)
// 在第2行的中间放墙，分隔(2,0)和(2,4)

grid[2][1] = '#';  // 分隔(2,0)和(2,4)
grid[2][2] = '#';  // 中心墙
grid[2][3] = '#';  // 分隔(2,0)和(2,4)

// 等等，(2,0)灯塔和(2,4)灯塔同行，中间有墙(2,1),(2,2),(2,3)，OK
// (0,2)灯塔和(4,2)灯塔同列，中间有墙(1,2),(2,2),(3,2)，OK

console.log('\n添加分隔墙后:');
console.log(printGrid(grid));

// 验证照亮
lit.clear();
for (const [r, c] of lights4) {
  for (let j = c; j >= 0; j--) {
    if (grid[r][j] !== ' ') break;
    lit.add(`${r},${j}`);
  }
  for (let j = c; j < size; j++) {
    if (grid[r][j] !== ' ') break;
    lit.add(`${r},${j}`);
  }
  for (let i = r; i >= 0; i--) {
    if (grid[i][c] !== ' ') break;
    lit.add(`${i},${c}`);
  }
  for (let i = r; i < size; i++) {
    if (grid[i][c] !== ' ') break;
    lit.add(`${i},${c}`);
  }
}
console.log('照亮格子:', lit.size);

// 未照亮格子
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === ' ' && !lit.has(`${r},${c}`)) {
      console.log(`未照亮: (${r},${c})`);
    }
  }
}

// 辅助函数
function printGrid(grid) {
  return grid.map(row => row.map(c => {
    if (c === ' ') return '.';
    return c;
  }).join(' ')).join('\n');
}