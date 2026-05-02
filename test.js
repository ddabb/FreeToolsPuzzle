const CELL_WHITE = 0;
const CELL_BLACK = 1;

const testSolution = [
  [0,1,0,0,0],
  [0,1,0,1,0],
  [1,1,1,1,0],
  [0,1,0,0,0],
  [0,1,0,0,0]
];

function getWhiteRegions(grid) {
  const size = grid.length;
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const regions = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_WHITE && !visited[r][c]) {
        const region = [];
        const queue = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          region.push([cr, cc]);

          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = cr + dr, nc = cc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                !visited[nr][nc] && grid[nr][nc] === CELL_WHITE) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }

        regions.push(region);
      }
    }
  }
  return regions;
}

console.log('Solution grid:');
for (let row of testSolution) {
  console.log(row.join(' '));
}
console.log('Regions:');
const regions = getWhiteRegions(testSolution);
console.log(regions);
for (let i = 0; i < regions.length; i++) {
  console.log(`Region ${i + 1}: size = ${regions[i].length}, cells =`, regions[i]);
}
