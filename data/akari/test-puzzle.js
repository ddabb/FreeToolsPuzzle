// 测试实际题目
const fs = require('fs');
const path = require('path');

const puzzlePath = path.join(__dirname, 'easy-0001.json');
const puzzle = JSON.parse(fs.readFileSync(puzzlePath, 'utf8'));

console.log('题目:');
console.log('size:', puzzle.size);
console.log('grid:', puzzle.grid);
console.log('answer:', puzzle.answer);

// 转换grid
const grid = puzzle.grid.map(row => row.map(cell => cell === ' ' ? 0 : cell));
console.log('\n转换后的grid:');
console.log(grid);

// 统计空格和墙
let emptyCount = 0;
let wallCount = 0;
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] === 0) emptyCount++;
    else if (grid[r][c] > 0) wallCount++;
  }
}
console.log('\n空格数:', emptyCount);
console.log('墙数:', wallCount);
console.log('总计:', emptyCount + wallCount, '/', grid.length * grid[0].length);

// 检查answer是否是有效解
console.log('\n检查answer是否有效...');
const lights = puzzle.answer;
let valid = true;

// 检查灯塔是否冲突
for (let i = 0; i < lights.length; i++) {
  for (let j = i + 1; j < lights.length; j++) {
    const l1 = lights[i];
    const l2 = lights[j];
    if (l1[0] === l2[0] || l1[1] === l2[1]) {
      // 同行或同列，检查中间是否有墙
      if (l1[0] === l2[0]) {
        // 同行
        const minC = Math.min(l1[1], l2[1]);
        const maxC = Math.max(l1[1], l2[1]);
        let blocked = false;
        for (let c = minC + 1; c < maxC; c++) {
          if (grid[l1[0]][c] > 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          console.log('灯塔冲突:', l1, l2);
          valid = false;
        }
      } else {
        // 同列
        const minR = Math.min(l1[0], l2[0]);
        const maxR = Math.max(l1[0], l2[0]);
        let blocked = false;
        for (let r = minR + 1; r < maxR; r++) {
          if (grid[r][l1[1]] > 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          console.log('灯塔冲突:', l1, l2);
          valid = false;
        }
      }
    }
  }
}

// 检查数字约束
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] > 0 && grid[r][c] < 5) {
      let count = 0;
      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ];
      for (const n of neighbors) {
        if (n[0] >= 0 && n[0] < grid.length && n[1] >= 0 && n[1] < grid[0].length) {
          if (lights.some(l => l[0] === n[0] && l[1] === n[1])) {
            count++;
          }
        }
      }
      if (count !== grid[r][c]) {
        console.log(`数字约束不满足: (${r},${c}) 需要${grid[r][c]}个灯塔，实际${count}个`);
        valid = false;
      }
    }
  }
}

console.log('\nanswer有效:', valid);
