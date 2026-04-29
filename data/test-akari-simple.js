/**
 * 测试 Akari 解法器 - 简单测试用例
 */

const { solve, countSolutions } = require('./akari-solver');

// 简单测试用例1: 3x3 网格，中心有一个数字0的黑格
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
console.log('');

// 测试2: 2x2 网格，无黑格（所有白格）
// . .
// . .
const test2 = [
  [' ', ' '],
  [' ', ' ']
];

console.log('测试2: 2x2 全白格');
const sol2 = solve(test2);
console.log('解法器结果:', sol2 ? '有解' : '无解');
if (sol2) {
  console.log('灯光位置:');
  sol2.lights.forEach((row, r) => {
    console.log(row.map(l => l ? '💡' : '.').join(' '));
  });
}
console.log('');

// 测试3: 已知有唯一解的题目 (从网上找的简单题目)
// . . 2 . .
// . . . . .
// 2 . . . 2
// . . . . .
// . . 2 . .
const test3 = [
  [' ', ' ', 2, ' ', ' '],
  [' ', ' ', ' ', ' ', ' '],
  [2, ' ', ' ', ' ', 2],
  [' ', ' ', ' ', ' ', ' '],
  [' ', ' ', 2, ' ', ' ']
];

console.log('测试3: 5x5 有数字的题');
const sol3 = solve(test3);
console.log('解法器结果:', sol3 ? '有解' : '无解');
if (sol3) {
  console.log('灯光位置:');
  sol3.lights.forEach((row, r) => {
    console.log(row.map(l => l ? '💡' : '.').join(' '));
  });
}
console.log('解的数量:', countSolutions(test3, 2));
