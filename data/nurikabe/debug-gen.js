// Debug: check what's failing
const size = 5;
const maxRoom = 4;
const minRoom = 1;
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

function bfsWhiteComponent(grid, size, sr, sc) {
  const visited = new Set();
  const queue = [[sr, sc]];
  visited.add(sr * size + sc);
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of neighbors(r, c, size)) {
      const key = nr * size + nc;
      if (!visited.has(key) && grid[nr][nc] === 0) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size;
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

function checkBlackConnected(grid, size) {
  let first = null, count = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === 1) { count++; if (!first) first = [r, c]; }
  if (count === 0) return false;
  const visited = new Set();
  const queue = [first];
  visited.add(first[0] * size + first[1]);
  while (queue.length) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of neighbors(r, c, size)) {
      const key = nr * size + nc;
      if (!visited.has(key) && grid[nr][nc] === 1) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size === count;
}

let failReasons = { roomTooBig: 0, roomTooSmall: 0, blackDisconnected: 0, total: 0 };

for (let attempt = 0; attempt < 200; attempt++) {
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  const blackTarget = Math.floor(total * (0.40 + Math.random() * 0.15));
  
  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);
  grid[startR][startC] = 1;
  let blackCount = 1;
  let frontier = [[startR, startC]];
  
  while (blackCount < blackTarget && frontier.length > 0) {
    const fi = Math.floor(Math.random() * frontier.length);
    const [fr, fc] = frontier[fi];
    const adj = shuffle(neighbors(fr, fc, size));
    let expanded = false;
    for (const [nr, nc] of adj) {
      if (grid[nr][nc] === 1) continue;
      grid[nr][nc] = 1;
      let has22 = false;
      for (let r = Math.max(0, nr-1); r <= Math.min(size-2, nr); r++) {
        for (let c = Math.max(0, nc-1); c <= Math.min(size-2, nc); c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            has22 = true; break;
          }
        }
        if (has22) break;
      }
      if (has22) { grid[nr][nc] = 0; continue; }
      
      let tooBig = false;
      for (const [wr, wc] of neighbors(nr, nc, size)) {
        if (grid[wr][wc] === 0) {
          const compSize = bfsWhiteComponent(grid, size, wr, wc);
          if (compSize > maxRoom) { tooBig = true; break; }
        }
      }
      if (tooBig) { grid[nr][nc] = 0; continue; }
      
      frontier.push([nr, nc]);
      blackCount++;
      expanded = true;
      break;
    }
    if (!expanded) frontier.splice(fi, 1);
  }
  
  // Check results
  const components = getAllWhiteComponents(grid, size);
  let roomValid = true;
  let maxActual = 0;
  for (const comp of components) {
    if (comp.length > maxActual) maxActual = comp.length;
    if (comp.length > maxRoom || comp.length < minRoom) { roomValid = false; break; }
  }
  const blackConn = checkBlackConnected(grid, size);
  
  failReasons.total++;
  if (!roomValid) {
    // Which direction?
    for (const comp of components) {
      if (comp.length > maxRoom) { failReasons.roomTooBig++; break; }
      if (comp.length < minRoom) { failReasons.roomTooSmall++; break; }
    }
  }
  if (roomValid && !blackConn) failReasons.blackDisconnected++;
  
  if (attempt < 5) {
    console.log(`\nAttempt ${attempt}: black=${blackCount}/${blackTarget}, rooms=${components.map(c=>c.length).join(',')}, maxRoom=${maxActual}, blackConn=${blackConn}`);
    for (let r = 0; r < size; r++) {
      console.log(grid[r].map(v => v === 1 ? '█' : '·').join(' '));
    }
  }
}

console.log('\nFailure stats (out of 200 attempts):');
console.log(failReasons);
