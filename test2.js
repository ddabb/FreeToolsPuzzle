const CELL_WHITE = 0;
const CELL_BLACK = 1;

const testSolution = [
  [0,1,0,0,0],
  [0,1,0,1,0],
  [1,1,1,1,0],
  [0,1,0,0,0],
  [0,1,0,0,0]
];

function areBlackCellsConnected(grid) {
  const size = grid.length;
  let startR = -1, startC = -1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_BLACK) {
        startR = r;
        startC = c;
        break;
      }
    }
    if (startR !== -1) break;
  }

  if (startR === -1) return false;

  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const queue = [[startR, startC]];
  let connectedCount = 0;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    if (visited[cr][cc]) continue;
    if (grid[cr][cc] !== CELL_BLACK) continue;

    visited[cr][cc] = true;
    connectedCount++;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = cr + dr, nc = cc + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        queue.push([nr, nc]);
      }
    }
  }

  let totalBlack = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_BLACK) totalBlack++;
    }
  }

  console.log(`Total black cells: ${totalBlack}, connected count: ${connectedCount}`);
  return connectedCount === totalBlack;
}

console.log('Testing areBlackCellsConnected on:');
for (let row of testSolution) {
  console.log(row.join(' '));
}
const result = areBlackCellsConnected(testSolution);
console.log(`Result: ${result}`);
