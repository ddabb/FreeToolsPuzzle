// Test slither-link solver with medium-0001
const fs = require('fs');
const code = fs.readFileSync('F:/SelfJob/freetools/data/slither-link/slitherlink-solver.js', 'utf8');
const SlitherLinkSolver = eval(code);

// Load puzzle
const puzzle = JSON.parse(fs.readFileSync('F:/SelfJob/freetools/data/slither-link/medium/medium-0001.json', 'utf8'));
console.log('Puzzle size:', puzzle.size, 'x', puzzle.size);
console.log('Grid:', JSON.stringify(puzzle.grid));

const result = SlitherLinkSolver.solve(puzzle.grid);
console.log('Result:', result === null ? 'null (no solution)' : 'has solution');
if (result) {
  const h = result.h;
  const v = result.v;
  console.log('Got h:', JSON.stringify(h));
  console.log('Got v:', JSON.stringify(v));
  console.log('Expected h:', JSON.stringify(puzzle.answer.h));
  console.log('Expected v:', JSON.stringify(puzzle.answer.v));
  console.log('h match:', JSON.stringify(h) === JSON.stringify(puzzle.answer.h));
  console.log('v match:', JSON.stringify(v) === JSON.stringify(puzzle.answer.v));
  
  // Check unique
  const unique = SlitherLinkSolver.checkUnique(puzzle.grid);
  console.log('Unique:', unique.unique, 'count:', unique.solutionCount);
}
