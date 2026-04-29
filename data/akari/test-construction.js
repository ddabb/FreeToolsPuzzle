/**
 * 重新理解Akari规则，构造正确谜题
 *
 * Akari规则：
 * 1. 灯塔不能互相照射（同行同列必须中间有墙）
 * 2. 数字墙周围恰好N个灯塔
 * 3. 所有空格必须被照亮
 */

const fs = require('fs');
const path = require('path');

// 最简单的例子：逐步构造
console.log('=== 构造一个简单的5x5谜题 ===\n');

// 步骤1: 从空板开始
console.log('步骤1: 空板');
let grid = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];
console.log(printGrid(grid));

// 步骤2: 放置第一个灯塔
console.log('\n步骤2: 在(0,0)放灯塔');
let lights = [[0, 0]];
console.log('灯塔:', lights);
console.log('照亮的格子:', getLitCells(grid, lights));

// 步骤3: 添加墙来分隔灯塔
console.log('\n步骤3: 添加墙');
grid = [
  [' ', ' ', '#', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  ['#', ' ', ' ', ' ', '#'],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', '#', ' ', ' ']
];
console.log(printGrid(grid));

// 步骤4: 放置更多灯塔
console.log('\n步骤4: 放置更多灯塔');
lights = [[0, 0], [0, 4], [1, 2], [2, 0], [2, 4], [4, 2]];
console.log('灯塔:', lights);
console.log('照亮的格子:', getLitCells(grid, lights));

// 步骤5: 添加数字约束
console.log('\n步骤5: 添加数字约束');
grid = [
  [' ', ' ', 1, ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [1, ' ', ' ', ' ', 1],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', 1, ' ', ' ']
];
console.log(printGrid(grid));

// 验证
console.log('\n验证:');
console.log('灯塔冲突?', checkLightConflict(grid, lights));
console.log('数字约束满足?', checkWallConstraints(grid, lights));
console.log('所有格子照亮?', checkAllLit(grid, lights));

// 辅助函数
function printGrid(grid) {
  return grid.map(row => row.map(c => {
    if (c === ' ') return '.';
    return c;
  }).join(' ')).join('\n');
}

function getLitCells(grid, lights) {
  const size = grid.length;
  const lit = new Set();

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

  return Array.from(lit).sort();
}

function checkLightConflict(grid, lights) {
  const size = grid.length;
  for (let i = 0; i < lights.length; i++) {
    for (let j = i + 1; j < lights.length; j++) {
      const [r1, c1] = lights[i];
      const [r2, c2] = lights[j];

      if (r1 === r2) {
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        let blocked = false;
        for (let c = minC + 1; c < maxC; c++) {
          if (grid[r1][c] !== ' ') {
            blocked = true;
            break;
          }
        }
        if (!blocked) return `冲突: (${r1},${c1}) 和 (${r2},${c2})`;
      }

      if (c1 === c2) {
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        let blocked = false;
        for (let r = minR + 1; r < maxR; r++) {
          if (grid[r][c1] !== ' ') {
            blocked = true;
            break;
          }
        }
        if (!blocked) return `冲突: (${r1},${c1}) 和 (${r2},${c2})`;
      }
    }
  }
  return false;
}

function checkWallConstraints(grid, lights) {
  const size = grid.length;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const lightSet = new Set(lights.map(([r, c]) => `${r},${c}`));

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
        if (count !== cell) return `不满足: (${r},${c}) 需要${cell}个，实际${count}个`;
      }
    }
  }
  return false;
}

function checkAllLit(grid, lights) {
  const size = grid.length;
  const lit = new Set();

  for (const [r, c] of lights) {
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

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === ' ' && !lit.has(`${r},${c}`)) {
        return `未照亮: (${r},${c})`;
      }
    }
  }
  return false;
}
