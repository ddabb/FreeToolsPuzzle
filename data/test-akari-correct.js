/**
 * 测试 Akari 解法器 - 使用已知有解的题目
 */

const { solve, countSolutions, hasUniqueSolution } = require('./akari-solver');

// 测试用例1: 简单 3x3，中心数字0
// . . .
// . 0 .
// . . .
const test1 = [
  [' ', ' ', ' '],
  [' ', 0, ' '],
  [' ', ' ', ' ']
];

console.log('测试1: 3x3 网格，中心数字0');
console.log('网格:');
test1.forEach(row => console.log(row.map(c => c === ' ' ? '.' : c).join(' ')));
const sol1 = solve(test1);
console.log('解法器结果:', sol1 ? '有解' : '无解');
if (sol1) {
  console.log('灯光位置:');
  sol1.lights.forEach((row, r) => {
    console.log(row.map(l => l ? '💡' : '.').join(' '));
  });
}
console.log('解的数量:', countSolutions(test1, 2));
console.log('');

// 测试用例2: 已知有唯一解的 5x5 题目 (从网上找的简单题)
// . . . . .
// . . 2 . .
// . 2 . 2 .
// . . . . .
// . . . . .
// 这个可能无解，换个简单题

// 更简单的题: 只有一个数字2的黑格在中间，四周都是白格
// . . . . .
// . . . . .
// . . 2 . .
// . . . . .
// . . . . .
const test2 = [
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', 2, ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ']
];

console.log('测试2: 5x5，中心数字2');
const sol2 = solve(test2);
console.log('解法器结果:', sol2 ? '有解' : '无解');
if (sol2) {
  console.log('灯光位置:');
  sol2.lights.forEach((row, r) => {
    console.log(row.map(l => l ? '💡' : '.').join(' '));
  });
  console.log('解的数量:', countSolutions(test2, 2));
} else {
  console.log('尝试计算解的数量...');
  console.log('解的数量:', countSolutions(test2, 2));
}
console.log('');

// 测试用例3: 从 borroot/akari 论文中的简单题
// 7x7 简单题
const test3 = [
  [' ', ' ', 2, ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', 2, ' ', ' '],
  [' ', 2, ' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', 0, ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ', 2, ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' '],
  [' ', ' ', ' ', ' ', ' ', ' ', ' ']
];

console.log('测试3: 7x7 有数字的题');
const sol3 = solve(test3);
console.log('解法器结果:', sol3 ? '有解' : '无解');
if (sol3) {
  console.log('灯光位置:');
  sol3.lights.forEach((row, r) => {
    console.log(row.map(l => l ? '💡' : '.').join(' '));
  });
}
console.log('');

// 测试用例4: 从生成的数据中读取一个题目
const fs = require('fs');
const path = require('path');
try {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'akari', 'easy-0001.json'), 'utf8'));
  console.log('测试4: 从 easy-0001.json 读取的题目');
  console.log('网格:');
  data.grid.forEach(row => console.log(row.map(c => c === ' ' ? '.' : c).join(' ')));
  const sol4 = solve(data.grid);
  console.log('解法器结果:', sol4 ? '有解' : '无解');
  if (sol4) {
    console.log('灯光位置:');
    sol4.lights.forEach((row, r) => {
      console.log(row.map(l => l ? '💡' : '.').join(' '));
    });
  }
  console.log('解的数量:', countSolutions(data.grid, 2));
} catch (e) {
  console.log('测试4: 读取文件失败', e.message);
}
