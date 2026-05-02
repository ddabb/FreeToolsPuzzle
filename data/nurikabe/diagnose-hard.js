/**
 * Nurikabe Generator - Diagnostic version
 * Understanding why hard fails
 */

const fs = require('fs');
const path = require('path');

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

const size = 10;
const total = size * size;

const failReasons = { roomSize: 0, twoByTwo: 0, notConnected: 0, total: 0 };

for (let attempt = 0; attempt < 200; attempt++) {
  failReasons.total++;
  
  // Step 1: Create rooms
  const roomId = Array.from({length: size}, () => Array(size).fill(0));
  let nextRoomId = 1;
  const rooms = [];
  
  const allCells = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      allCells.push([r, c]);
  shuffle(allCells);
  
  for (const [sr, sc] of allCells) {
    if (roomId[sr][sc] !== 0) continue;
    const targetSize = 1 + Math.floor(Math.random() * 5); // 1-5
    const rid = nextRoomId++;
    roomId[sr][sc] = rid;
    const roomCells = [[sr, sc]];
    const queue = [[sr, sc]];
    while (queue.length && roomCells.length < targetSize) {
      const idx = Math.floor(Math.random() * queue.length);
      const [r, c] = queue[idx];
      queue.splice(idx, 1);
      const adj = shuffle(neighbors(r, c, size));
      for (const [nr, nc] of adj) {
        if (roomId[nr][nc] !== 0) continue;
        if (roomCells.length >= targetSize) break;
        roomId[nr][nc] = rid;
        roomCells.push([nr, nc]);
        queue.push([nr, nc]);
      }
    }
    rooms.push(roomCells);
  }
  
  // Step 2: Turn small rooms black
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  const targetBlack = 0.48;
  const blackTargetMin = Math.floor(total * targetBlack);
  let blackCount = 0;
  
  const roomIndices = rooms.map((_, i) => i);
  roomIndices.sort((a, b) => rooms[a].length - rooms[b].length);
  
  for (const ri of roomIndices) {
    if (blackCount >= blackTargetMin && rooms[ri].length > 2) break;
    if (rooms[ri].length > 2 && blackCount >= blackTargetMin * 0.7) break;
    for (const [r, c] of rooms[ri]) {
      grid[r][c] = 1;
      blackCount++;
    }
  }
  
  // Step 3: Check room sizes BEFORE fixing 2x2/connectivity
  let preComponents = getAllWhiteComponents(grid, size);
  let preMaxRoom = Math.max(...preComponents.map(c => c.length));
  
  // Step 4: Fix 2x2
  let had2x2 = has2x2Black(grid, size);
  for (let fixPass = 0; fixPass < 50; fixPass++) {
    if (!has2x2Black(grid, size)) break;
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
          const cells = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
          for (const [fr, fc] of cells) {
            grid[fr][fc] = 0;
            if (!has2x2Black(grid, size)) break;
            grid[fr][fc] = 1;
          }
        }
      }
    }
  }
  let fixed2x2 = !has2x2Black(grid, size);
  
  // Step 5: Check connectivity
  let connected = checkBlackConnected(grid, size);
  
  // Step 6: Final room sizes
  let postComponents = getAllWhiteComponents(grid, size);
  let postMaxRoom = Math.max(...postComponents.map(c => c.length));
  
  if (attempt < 5) {
    console.log(`Attempt ${attempt}: rooms=${rooms.length}, black=${blackCount}/${blackTargetMin}, had2x2=${had2x2}, fixed2x2=${fixed2x2}, connected=${connected}, preMaxRoom=${preMaxRoom}, postMaxRoom=${postMaxRoom}`);
    console.log('  room sizes:', rooms.map(r => r.length).sort((a,b)=>b-a).slice(0,15).join(','));
  }
  
  if (!fixed2x2) { failReasons.twoByTwo++; continue; }
  if (!connected) { failReasons.notConnected++; continue; }
  
  let valid = true;
  for (const room of postComponents) {
    if (room.length > 8 || room.length < 1) { valid = false; break; }
  }
  if (!valid) { failReasons.roomSize++; continue; }
}

console.log('\nFail reasons:', JSON.stringify(failReasons));
console.log(`Success rate: ${((200 - failReasons.twoByTwo - failReasons.notConnected - failReasons.roomSize) / 200 * 100).toFixed(1)}%`);
