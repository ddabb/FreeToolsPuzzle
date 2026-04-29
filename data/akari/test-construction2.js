/**
 * 正确的构造方法：
 * 1. 先确定灯塔位置（确保不冲突）
 * 2. 添加墙分隔灯塔
 * 3. 添加数字约束
 * 4. 验证所有格子被照亮
 */

const fs = require('fs');
const path = require('path');

console.log('=== 正确构造5x5谜题 ===\n');

// 步骤1: 确定灯塔位置（同行同列最多一个）
console.log('步骤1: 确定灯塔位置');
// 策略：每行放一个，错开列
const lights = [
  [0, 1],  // 第0行，列1
  [1, 3],  // 第1行，列3
  [2, 0],  // 第2行，列0
  [3, 2],  // 第3行，列2
  [4, 4]   // 第4行，列4
];
console.log('灯塔:', lights);

// 步骤2: 添加墙分隔灯塔
console.log('\n步骤2: 添加墙分隔灯塔');
let grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

// 在灯塔之间添加墙
// (0,1) 和 (1,3) 不冲突（不同行不同列）
// 但需要检查是否有灯塔同行同列

// 检查灯塔冲突
function hasConflict(lights, grid) {
  const size = grid.length;
  for (let i = 0; i < lights.length; i++) {
    for (let j = i + 1; j < lights.length; j++) {
      const [r1, c1] = lights[i];
      const [r2, c2] = lights[j];

      if (r1 === r2) {
        // 同行，检查中间是否有墙
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        let blocked = false;
        for (let c = minC + 1; c < maxC; c++) {
          if (grid[r1][c] !== ' ') {
            blocked = true;
            break;
          }
        }
        if (!blocked) return [lights[i], lights[j], 'row'];
      }

      if (c1 === c2) {
        // 同列，检查中间是否有墙
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        let blocked = false;
        for (let r = minR + 1; r < maxR; r++) {
          if (grid[r][c1] !== ' ') {
            blocked = true;
            break;
          }
        }
        if (!blocked) return [lights[i], lights[j], 'col'];
      }
    }
  }
  return null;
}

let conflict = hasConflict(lights, grid);
console.log('冲突检查:', conflict ? `有冲突: ${JSON.stringify(conflict)}` : '无冲突');

// 添加墙来消除冲突
// 检查列1是否有多个灯塔
const col1Lights = lights.filter(([r, c]) => c === 1);
console.log('列1的灯塔:', col1Lights);

// 检查列2是否有多个灯塔
const col2Lights = lights.filter(([r, c]) => c === 2);
console.log('列2的灯塔:', col2Lights);

// 检查列3是否有多个灯塔
const col3Lights = lights.filter(([r, c]) => c === 3);
console.log('列3的灯塔:', col3Lights);

// 检查列4是否有多个灯塔
const col4Lights = lights.filter(([r, c]) => c === 4);
console.log('列4的灯塔:', col4Lights);

// 好的，没有同行同列的灯塔，所以不会冲突
// 但需要添加墙来限制灯塔的照射范围

// 步骤3: 添加墙和数字约束
console.log('\n步骤3: 添加墙和数字约束');
grid = [
  [' ', ' ', '#', ' ', ' '],
  [' ', '#', ' ', ' ', ' '],
  [' ', ' ', ' ', '#', ' '],
  ['#', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

console.log(printGrid(grid));

// 步骤4: 验证
console.log('\n步骤4: 验证');
console.log('灯塔:', lights);
console.log('灯塔冲突?', hasConflict(lights, grid) || '无冲突');

// 检查所有格子是否被照亮
const lit = getLitCells(grid, lights);
console.log('照亮的格子数:', lit.length);

const size = grid.length;
let allLit = true;
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    if (grid[r][c] === ' ' && !lit.has(`${r},${c}`)) {
      console.log(`未照亮: (${r},${c})`);
      allLit = false;
    }
  }
}
console.log('所有格子照亮?', allLit ? '是' : '否');

// 步骤5: 添加数字约束
console.log('\n步骤5: 添加数字约束');
grid = [
  [' ', ' ', 0, ' ', ' '],
  [' ', 0, ' ', ' ', ' '],
  [' ', ' ', ' ', 0, ' '],
  [0, ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

console.log(printGrid(grid));

// 验证数字约束
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const lightSet = new Set(lights.map(([r, c]) => `${r},${c}`));

console.log('\n验证数字约束:');
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    const cell = grid[r][c];
    if (typeof cell === 'number' && cell >= 0 && cell <= 4) {
      let count = 0;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (lightSet.has(`${nr},${nc}`)) count++;
        }
      }
      console.log(`  (${r},${c}) 数字${cell}，周围灯塔${count}个`, count === cell ? '✓' : '✗');
    }
  }
}

// 辅助函数
function printGrid(grid) {
  return grid.map(row => row.map(c => {
    if (c === ' ') return '.';
    if (c === 0) return '0';
    return c;
  }).join(' ')).join('\n');
}

function getLitCells(grid, lights) {
  const size = grid.length;
  const lit = new Set();

  for (const [r, c] of lights) {
    // 照亮同行
    for (let j = c; j >= 0; j--) {
      if (grid[r][j] !== ' ' && grid[r][j] !== 0) break;
      lit.add(`${r},${j}`);
    }
    for (let j = c; j < size; j++) {
      if (grid[r][j] !== ' ' && grid[r][j] !== 0) break;
      lit.add(`${r},${j}`);
    }
    // 照亮同列
    for (let i = r; i >= 0; i--) {
      if (grid[i][c] !== ' ' && grid[i][c] !== 0) break;
      lit.add(`${i},${c}`);
    }
    for (let i = r; i < size; i++) {
      if (grid[i][c] !== ' ' && grid[i][c] !== 0) break;
      lit.add(`${i},${c}`);
    }
  }

  return lit;
}
