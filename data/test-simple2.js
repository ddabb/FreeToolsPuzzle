/**
 * 测试简单数回题目
 */

const validateSlitherLink = require('./validators/slither-link');

// 一个简单的3x3数回题目，应该有唯一解
// 0 1 0
// 0 0 0
// 0 0 0
const simplePuzzle = {
  size: 3,
  grid: [
    [0, 1, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
};

console.log('Testing simple puzzle:', JSON.stringify(simplePuzzle, null, 2));
const result = validateSlitherLink(simplePuzzle);
console.log('Result:', result);

// 另一个测试：一个确定没有解的题目
const noSolutionPuzzle = {
  size: 3,
  grid: [
    [0, 5, 0],
    [0, 0, 0],
    [0, 0, 0]
  ]
};

console.log('\nTesting no-solution puzzle (cell value 5 > 4):', JSON.stringify(noSolutionPuzzle, null, 2));
const result2 = validateSlitherLink(noSolutionPuzzle);
console.log('Result:', result2);