const fs = require('fs');
const easy = JSON.parse(fs.readFileSync('F:/SelfJob/freetools/data/slither-link/easy/easy-0001.json', 'utf8'));
const medium = JSON.parse(fs.readFileSync('F:/SelfJob/freetools/data/slither-link/medium/medium-0001.json', 'utf8'));
console.log('Easy grid (5x5):');
easy.grid.forEach((row, i) => console.log(i + ':', row.join(' ')));
console.log('\nMedium grid (7x7):');
medium.grid.forEach((row, i) => console.log(i + ':', row.join(' ')));
const easyZeros = easy.grid.flat().filter(v => v === 0).length;
const mediumZeros = medium.grid.flat().filter(v => v === 0).length;
console.log('\nEasy zeros:', easyZeros, '/ 25');
console.log('Medium zeros:', mediumZeros, '/ 49');
// Test the bug: count wrong hints with hint >= 0
const EDGE_LINE = 1;
let wrongEasy = 0, wrongMedium = 0;
const answerEasy = easy.answer, answerMedium = medium.answer;
for (let r = 0; r < easy.grid.length; r++) {
  for (let c = 0; c < easy.grid[0].length; c++) {
    const hint = easy.grid[r][c];
    if (hint >= 0 && hint !== null && hint !== undefined) {
      const count = (answerEasy.h[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.h[r+1][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.v[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.v[r][c+1] === EDGE_LINE ? 1 : 0);
      if (count !== hint) wrongEasy++;
    }
  }
}
for (let r = 0; r < medium.grid.length; r++) {
  for (let c = 0; c < medium.grid[0].length; c++) {
    const hint = medium.grid[r][c];
    if (hint >= 0 && hint !== null && hint !== undefined) {
      const count = (answerMedium.h[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.h[r+1][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.v[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.v[r][c+1] === EDGE_LINE ? 1 : 0);
      if (count !== hint) wrongMedium++;
    }
  }
}
console.log('\nWrong hints (with hint>=0 bug): easy=' + wrongEasy + ' medium=' + wrongMedium);
// Fixed: skip hint=0
wrongEasy = 0; wrongMedium = 0;
for (let r = 0; r < easy.grid.length; r++) {
  for (let c = 0; c < easy.grid[0].length; c++) {
    const hint = easy.grid[r][c];
    if (hint > 0 && hint !== null && hint !== undefined) {
      const count = (answerEasy.h[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.h[r+1][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.v[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerEasy.v[r][c+1] === EDGE_LINE ? 1 : 0);
      if (count !== hint) wrongEasy++;
    }
  }
}
for (let r = 0; r < medium.grid.length; r++) {
  for (let c = 0; c < medium.grid[0].length; c++) {
    const hint = medium.grid[r][c];
    if (hint > 0 && hint !== null && hint !== undefined) {
      const count = (answerMedium.h[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.h[r+1][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.v[r][c] === EDGE_LINE ? 1 : 0) +
                    (answerMedium.v[r][c+1] === EDGE_LINE ? 1 : 0);
      if (count !== hint) wrongMedium++;
    }
  }
}
console.log('Wrong hints (with hint>0 fixed): easy=' + wrongEasy + ' medium=' + wrongMedium);
