// Quick debug for hard
const size = 10;
const maxRoom = 6;
const total = size * size;

function neighbors(r, c, size) {
  const n = [];
  if (r > 0) n.push([r-1, c]);
  if (r < size-1) n.push([r+1, c]);
  if (c > 0) n.push([r, c-1]);
  if (c < size-1) n.push([r, c+1]);
  return n;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAllWhiteComponents(grid, size) {
  const visited = Array.from({length: size}, () => Array(size).fill(false));
  const components = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c] || grid[r][c] === 1) continue;
      const cells = [];
      const queue = [[r, c]];
      visited[r][c] = true;
      while (queue.length) {
        const [cr, cc] = queue.shift();
        cells.push([cr, cc]);
        for (const [nr, nc] of neighbors(cr, cc, size)) {
          if (!visited[nr][nc] && grid[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
      components.push(cells);
    }
  }
  return components;
}

function has2x2Black(grid, size) {
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1)
        return true;
  return false;
}

// Generate snake path and test
const grid = Array.from({length: size}, () => Array(size).fill(0));

// Snake path
const path = [];
for (let r = 0; r < size; r++) {
  if (r % 2 === 0) {
    for (let c = 0; c < size; c++) path.push([r, c]);
  } else {
    for (let c = size - 1; c >= 0; c--) path.push([r, c]);
  }
}

// Make 53% black
const blackTarget = Math.floor(total * 0.53);
for (let i = 0; i < blackTarget; i++) {
  const [r, c] = path[i];
  grid[r][c] = 1;
}

const components = getAllWhiteComponents(grid, size);
console.log('Black cells:', blackTarget, '/', total);
console.log('Rooms:', components.map(c => c.length).join(', '));
console.log('Max room:', Math.max(...components.map(c => c.length)));
console.log('Has 2x2 black:', has2x2Black(grid, size));

for (let r = 0; r < size; r++) {
  let s = '';
  for (let c = 0; c < size; c++) {
    s += grid[r][c] === 1 ? '██' : '· ';
  }
  console.log(s);
}
