// Debug: trace isSingleLoop with medium-0001 answer
const fs = require('fs');
const puzzle = JSON.parse(fs.readFileSync('F:/SelfJob/freetools/data/slither-link/medium/medium-0001.json', 'utf8'));

const rows = 7, cols = 7;
const answer = puzzle.answer;
const hEdges = answer.h;
const vEdges = answer.v;

// Build dotDegree
const dotDegree = Array(rows + 1).fill(null).map(() => Array(cols + 1).fill(0));

for (let r = 0; r <= rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (hEdges[r] && hEdges[r][c] === 1) {
      dotDegree[r][c]++;
      dotDegree[r][c + 1]++;
    }
  }
}

for (let r = 0; r < rows; r++) {
  for (let c = 0; c <= cols; c++) {
    if (vEdges[r] && vEdges[r][c] === 1) {
      dotDegree[r][c]++;
      dotDegree[r + 1][c]++;
    }
  }
}

console.log('Dot degrees:');
for (let r = 0; r <= rows; r++) {
  console.log(r + ':', dotDegree[r].join(' '));
}

// Find start
let startR = -1, startC = -1;
let totalDots = 0;
let degreeNot2 = 0;
for (let r = 0; r <= rows; r++) {
  for (let c = 0; c <= cols; c++) {
    if (dotDegree[r][c] > 0) {
      if (dotDegree[r][c] !== 2) {
        degreeNot2++;
        console.log(`Degree not 2 at dot(${r},${c}): ${dotDegree[r][c]}`);
      }
      if (startR === -1) { startR = r; startC = c; }
      totalDots++;
    }
  }
}
console.log('Total dots with degree:', totalDots, 'degreeNot2:', degreeNot2);
console.log('Start dot:', startR, startC);

// BFS
const visited = new Set();
const queue = [[startR, startC]];
visited.add(`${startR},${startC}`);
let steps = 0;

while (queue.length > 0) {
  const [cr, cc] = queue.shift();
  steps++;
  if (steps > 1000) { console.log('Too many steps!'); break; }
  
  const neighbors = [];
  // Right
  if (cc + 1 <= cols && hEdges[cr] && hEdges[cr][cc] === 1) {
    neighbors.push([cr, cc + 1]);
  }
  // Left
  if (cc - 1 >= 0 && hEdges[cr] && hEdges[cr][cc - 1] === 1) {
    neighbors.push([cr, cc - 1]);
  }
  // Down
  if (cr + 1 <= rows && vEdges[cr] && vEdges[cr][cc] === 1) {
    neighbors.push([cr + 1, cc]);
  }
  // Up
  if (cr - 1 >= 0 && vEdges[cr - 1] && vEdges[cr - 1][cc] === 1) {
    neighbors.push([cr - 1, cc]);
  }

  for (const [nr, nc] of neighbors) {
    const key = `${nr},${nc}`;
    if (!visited.has(key)) {
      visited.add(key);
      queue.push([nr, nc]);
    }
  }
}

console.log('Visited:', visited.size, 'Expected:', totalDots);
console.log('Valid:', visited.size === totalDots);
