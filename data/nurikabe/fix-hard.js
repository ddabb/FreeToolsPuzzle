/**
 * Fix hard puzzles with rooms > 6 by splitting large rooms.
 * Strategy: Find the largest room, add a black cell inside it to split it,
 * then verify the puzzle is still valid.
 */

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

function has2x2Black(grid, size) {
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1)
        return true;
  return false;
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

const MAX_ROOM = 6;
let fixed = 0, failed = 0;

for (let i = 1; i <= 1000; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const { size, solution } = d;
  
  let rooms = getAllWhiteComponents(solution, size);
  let maxR = Math.max(...rooms.map(r => r.length));
  if (maxR <= MAX_ROOM) continue;
  
  // Need to fix this puzzle
  const grid = solution.map(r => [...r]);
  const puzzleGrid = d.grid.map(r => [...r]);
  
  let success = false;
  
  // Try up to 100 times to split rooms by adding black cells
  for (let attempt = 0; attempt < 100; attempt++) {
    rooms = getAllWhiteComponents(grid, size);
    maxR = Math.max(...rooms.map(r => r.length));
    if (maxR <= MAX_ROOM) { success = true; break; }
    
    // Find the largest room
    const bigRoom = rooms.reduce((a, b) => a.length > b.length ? a : b);
    
    // Find cells in this room that can be turned black
    // A good candidate is one that:
    // 1. Is not the number cell
    // 2. Won't create 2x2
    // 3. Won't disconnect the room too badly
    
    const numCells = new Set();
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (puzzleGrid[r][c] > 0) numCells.add(r * size + c);
    
    const candidates = bigRoom.filter(([r, c]) => 
      !numCells.has(r * size + c) && !wouldCreate2x2(grid, size, r, c)
    );
    
    if (candidates.length === 0) break;
    
    // Pick a random candidate
    const [cr, cc] = candidates[Math.floor(Math.random() * candidates.length)];
    grid[cr][cc] = 1;
    
    // Check black still connected
    if (!checkBlackConnected(grid, size)) {
      grid[cr][cc] = 0; // Undo
      continue;
    }
    
    // Check no 2x2
    if (has2x2Black(grid, size)) {
      grid[cr][cc] = 0; // Undo
      continue;
    }
    
    // Room was split - need to update puzzle grid numbers
    // Remove old number from the big room, add numbers for new rooms
    const newRooms = getAllWhiteComponents(grid, size);
    
    // Clear all numbers
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        puzzleGrid[r][c] = 0;
    
    // Assign new numbers
    for (const room of newRooms) {
      const idx = Math.floor(Math.random() * room.length);
      const [nr, nc] = room[idx];
      puzzleGrid[nr][nc] = room.length;
    }
  }
  
  if (success) {
    // Final validation
    const finalRooms = getAllWhiteComponents(grid, size);
    const finalMax = Math.max(...finalRooms.map(r => r.length));
    if (finalMax <= MAX_ROOM && !has2x2Black(grid, size) && checkBlackConnected(grid, size)) {
      d.grid = puzzleGrid;
      d.solution = grid;
      fs.writeFileSync(fp, JSON.stringify(d));
      fixed++;
    } else {
      failed++;
    }
  } else {
    failed++;
  }
}

console.log(`Fixed: ${fixed}, Failed: ${failed}`);
