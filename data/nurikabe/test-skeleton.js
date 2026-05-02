// Quick test: how many hard puzzles can we generate in 60 seconds?
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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function wouldCreate2x2(grid, size, r, c) {
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      let count = 0;
      if (grid[r0][c0] === 1) count++;
      if (grid[r0][c0+1] === 1) count++;
      if (grid[r0+1][c0] === 1) count++;
      if (count === 3) return true;
    }
  }
  return false;
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

const size = 10;
const total = 100;
const maxRoom = 6;
const minRoom = 1;
const targetBlack = 0.48;
const blackTargetMin = Math.floor(size * size * targetBlack);
const blackTargetMax = Math.floor(size * size * (targetBlack + 0.06));

let success = 0, fail = 0;
const failReasons = { roomSize: 0, black2x2: 0, blackNotConn: 0, blackLow: 0 };
const startTime = Date.now();

for (let i = 0; i < 1000; i++) {
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  
  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);
  grid[startR][startC] = 1;
  let blackCount = 1;
  
  const inFrontier = new Set();
  const frontier = [];
  
  const addToFrontier = (r, c) => {
    const k = r * size + c;
    if (inFrontier.has(k)) return;
    if (wouldCreate2x2(grid, size, r, c)) return;
    inFrontier.add(k);
    frontier.push([r, c]);
  };
  
  for (const [nr, nc] of neighbors(startR, startC, size)) {
    addToFrontier(nr, nc);
  }
  
  while (blackCount < blackTargetMax && frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const [r, c] = frontier[idx];
    frontier.splice(idx, 1);
    inFrontier.delete(r * size + c);
    
    if (grid[r][c] === 1) continue;
    if (wouldCreate2x2(grid, size, r, c)) continue;
    
    grid[r][c] = 1;
    blackCount++;
    
    for (const [nr, nc] of neighbors(r, c, size)) {
      if (grid[nr][nc] === 0) addToFrontier(nr, nc);
    }
    
    if (blackCount >= blackTargetMin && blackCount % 10 === 0) {
      const rooms = getAllWhiteComponents(grid, size);
      const maxActual = Math.max(...rooms.map(r => r.length));
      if (maxActual <= maxRoom) break;
    }
  }
  
  // Check
  if (has2x2Black(grid, size)) { failReasons.black2x2++; fail++; continue; }
  if (!checkBlackConnected(grid, size)) { failReasons.blackNotConn++; fail++; continue; }
  if (blackCount < blackTargetMin * 0.85) { failReasons.blackLow++; fail++; continue; }
  
  const rooms = getAllWhiteComponents(grid, size);
  const maxActual = Math.max(...rooms.map(r => r.length));
  if (maxActual > maxRoom || rooms.some(r => r.length < minRoom)) { failReasons.roomSize++; fail++; continue; }
  
  success++;
  if (success >= total) break;
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Generated ${success} in ${elapsed}s (${fail} fails)`);
console.log(`Fail reasons: ${JSON.stringify(failReasons)}`);
