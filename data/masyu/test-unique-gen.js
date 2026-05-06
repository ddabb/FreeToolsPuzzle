const { generatePuzzle } = require('./generate-masyu-v10.js');
const { countSolutions } = require('./solve-masyu-unique.js');

console.log('测试生成10题...\n');

for (let i = 1; i <= 10; i++) {
  const puzzle = generatePuzzle('easy', i);
  if (puzzle) {
    const count = countSolutions(puzzle.pearls, puzzle.dotSize, 2);
    console.log(`题${i}: 珍珠${puzzle.pearlCount}个(黑${puzzle.blackCount}/白${puzzle.whiteCount}) → ${count === 1 ? '唯一解' : count + '解'}`);
  } else {
    console.log(`题${i}: 生成失败`);
  }
}
