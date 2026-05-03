const fs = require('fs');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const filepath = 'F:/SelfJob/FreeToolsPuzzle/data/masyu/hard/hard-0001.json';
const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

const size = data.size;
const grid = data.grid;
const lines = data.lines;

console.log(`Size: ${size}`);
console.log(`Grid[0][0]: ${grid[0][0]} (should be ${BLACK} for BLACK)`);
console.log(`Lines[0][0]:`, JSON.stringify(lines[0][0]));

const cell = grid[0][0];
const line = lines[0][0];
const edgeCount = (line.top ? 1 : 0) + (line.right ? 1 : 0) + (line.bottom ? 1 : 0) + (line.left ? 1 : 0);
console.log(`Edge count at (0,0): ${edgeCount}`);

const isStraight = (line.top && line.bottom) || (line.left && line.right);
console.log(`Is straight at (0,0): ${isStraight}`);
console.log(`Cell type: ${cell === BLACK ? 'BLACK' : cell === WHITE ? 'WHITE' : 'EMPTY'}`);

if (cell === BLACK) {
  console.log(`BLACK pearl at (0,0) with isStraight=${isStraight} - ${isStraight ? 'INVALID (should be corner)' : 'VALID (corner OK)'}`);
} else if (cell === WHITE) {
  console.log(`WHITE pearl at (0,0) with isStraight=${isStraight} - ${isStraight ? 'VALID (straight OK)' : 'INVALID (should be straight)'}`);
}

console.log('\n--- Checking all cells for edge count !== 2 ---');
let invalidCells = [];
for (let r = 0; r < size; r++) {
  for (let c = 0; c < size; c++) {
    const l = lines[r][c];
    const ec = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
    if (ec !== 2 && ec !== 0) {
      invalidCells.push({r, c, ec, line: l});
    }
  }
}
console.log(`Invalid cells (edge count != 2 and != 0): ${invalidCells.length}`);
if (invalidCells.length > 0) {
  invalidCells.forEach(({r, c, ec, line}) => {
    console.log(`  (${r},${c}): edgeCount=${ec}, line=${JSON.stringify(line)}`);
  });
}

console.log('\n--- Checking top row cells with edgeCount=2 ---');
let topRowIssues = [];
for (let c = 0; c < size; c++) {
  const l = lines[0][c];
  const ec = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
  if (ec === 2) {
    const cellType = grid[0][c];
    const isStraight = (l.top && l.bottom) || (l.left && l.right);
    const expectedStraight = cellType === WHITE;
    if (isStraight !== expectedStraight) {
      topRowIssues.push({c, cellType, isStraight, expectedStraight});
    }
  }
}
console.log(`Top row pearl constraint issues: ${topRowIssues.length}`);
if (topRowIssues.length > 0) {
  topRowIssues.forEach(({c, cellType, isStraight, expectedStraight}) => {
    console.log(`  (0,${c}): cellType=${cellType === BLACK ? 'BLACK' : 'WHITE'}, isStraight=${isStraight}, expectedStraight=${expectedStraight}`);
  });
}