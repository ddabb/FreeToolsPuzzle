// Verify medium puzzles 1-5
const fs = require('fs');
const code = fs.readFileSync('F:/SelfJob/freetools/data/slither-link/slitherlink-solver.js', 'utf8');
const Solver = eval(code);

const results = [];
for (let i = 1; i <= 5; i++) {
  const id = String(i).padStart(4, '0');
  try {
    const puzzle = JSON.parse(fs.readFileSync(`F:/SelfJob/freetools/data/slither-link/medium/medium-${id}.json`, 'utf8'));
    const solverResult = Solver.solve(puzzle.grid);
    if (!solverResult) {
      results.push({ id, status: 'NO_SOLUTION' });
    } else {
      const hMatch = JSON.stringify(solverResult.h) === JSON.stringify(puzzle.answer.h);
      const vMatch = JSON.stringify(solverResult.v) === JSON.stringify(puzzle.answer.v);
      const unique = Solver.checkUnique(puzzle.grid);
      results.push({
        id,
        status: hMatch && vMatch ? 'OK' : 'MISMATCH',
        hMatch, vMatch,
        unique: unique.unique,
        solutionCount: unique.solutionCount
      });
    }
  } catch (e) {
    results.push({ id, status: 'ERROR', msg: e.message });
  }
}

console.log('Medium puzzles 1-5:');
results.forEach(r => console.log(JSON.stringify(r)));
