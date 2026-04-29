const fs = require('fs');
const p = JSON.parse(fs.readFileSync('F:/SelfJob/freetools/data/slither-link/medium/medium-0001.json', 'utf8'));
console.log('Grid (7x7):');
p.grid.forEach((r,i) => console.log(i+':', r.join(' ')));
console.log('\nAnswer h (8x7 horizontal edges):');
p.answer.h.forEach((r,i) => console.log(i+':', r.join(' ')));
console.log('\nAnswer v (7x8 vertical edges):');
p.answer.v.forEach((r,i) => console.log(i+':', r.join(' ')));
// Check bottom row (r=6) hints and edges
console.log('\nBottom row (r=6) hints:', p.grid[6]);
console.log('h[6] (above bottom row):', p.answer.h[6]);
console.log('h[7] (bottom border):', p.answer.h[7]);
console.log('v[6] (left side of bottom row cells):', p.answer.v[6]);
// Check dot degrees for bottom dots
const rows=7, cols=7;
const dotDeg = Array(rows+1).fill(0).map(() => Array(cols+1).fill(0));
for (let r=0; r<=rows; r++) {
  for (let c=0; c<cols; c++) {
    if (p.answer.h[r][c] === 1) {
      dotDeg[r][c]++;
      dotDeg[r][c+1]++;
    }
  }
}
for (let r=0; r<rows; r++) {
  for (let c=0; c<=cols; c++) {
    if (p.answer.v[r][c] === 1) {
      dotDeg[r][c]++;
      dotDeg[r+1][c]++;
    }
  }
}
console.log('\nDot degrees (bottom 2 rows):');
console.log('r=6:', dotDeg[6].join(' '));
console.log('r=7:', dotDeg[7].join(' '));
// Find dots with degree 1 (dangling)
const dangling = [];
for (let r=0; r<=rows; r++) {
  for (let c=0; c<=cols; c++) {
    if (dotDeg[r][c] === 1) dangling.push([r,c]);
  }
}
console.log('\nDangling dots (degree 1):', dangling);
