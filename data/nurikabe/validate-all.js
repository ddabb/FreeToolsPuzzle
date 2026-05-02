const fs = require('fs');
const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

function neighbors(r, c, size) {
  const n = [];
  if (r > 0) n.push([r-1, c]);
  if (r < size-1) n.push([r+1, c]);
  if (c > 0) n.push([r, c-1]);
  if (c < size-1) n.push([r, c+1]);
  return n;
}

function has2x2Black(grid, size) {
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1)
        return true;
  return false;
}

function checkBlackConnected(grid, size) {
  let count = 0, first = null;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === 1) { count++; if (!first) first = [r, c]; }
  if (!first) return false;
  const visited = new Set();
  const queue = [first];
  visited.add(first[0] * size + first[1]);
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of neighbors(r, c, size)) {
      const k = nr * size + nc;
      if (!visited.has(k) && grid[nr][nc] === 1) {
        visited.add(k);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size === count;
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

for (const diff of ['easy', 'medium', 'hard']) {
  let total = 0, valid = 0, invalid2x2 = 0, invalidConn = 0, invalidRoom = 0, invalidNum = 0;
  for (let i = 1; i <= 1000; i++) {
    const id = String(i).padStart(4, '0');
    const fp = `${DIR}/${diff}-${id}.json`;
    if (!fs.existsSync(fp)) continue;
    total++;
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const { size, grid, solution } = d;
    
    // Check 2x2
    if (has2x2Black(solution, size)) { invalid2x2++; continue; }
    // Check connectivity
    if (!checkBlackConnected(solution, size)) { invalidConn++; continue; }
    // Check rooms
    const rooms = getAllWhiteComponents(solution, size);
    const maxRoom = diff === 'easy' ? 4 : diff === 'medium' ? 5 : 8;
    const badRoom = rooms.some(r => r.length > maxRoom || r.length < 1);
    if (badRoom) { invalidRoom++; continue; }
    // Check numbers match room sizes
    const numCells = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c] > 0) numCells.push({r, c, num: grid[r][c]});
    
    let numValid = true;
    for (const {r, c, num} of numCells) {
      // Find the room this cell belongs to
      const room = rooms.find(room => room.some(([rr,cc]) => rr===r && cc===c));
      if (!room || room.length !== num) { numValid = false; break; }
    }
    if (!numValid) { invalidNum++; continue; }
    
    valid++;
  }
  console.log(`${diff}: ${valid}/${total} valid (2x2:${invalid2x2} conn:${invalidConn} room:${invalidRoom} num:${invalidNum})`);
}
