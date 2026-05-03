const fs = require('fs');
const d = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/slither-link/medium/medium-0001.json', 'utf8'));
console.log('size:', d.size);
console.log('grid exists:', !!d.grid);
console.log('keys:', Object.keys(d));
if (d.grid) {
  console.log('grid size:', d.grid.length, 'x', d.grid[0]?.length);
}
