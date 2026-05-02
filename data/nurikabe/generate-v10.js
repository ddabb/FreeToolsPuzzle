/**
 * Nurikabe Puzzle Generator v10
 * 
 * Strategy: "Grow then fix" - fast growth without room-size checks,
 * then iterative repair to satisfy all constraints.
 * 
 * Key insight: The bottleneck in v9 was checking room sizes on every cell
 * placement (O(N²) per check). Instead, grow the black tree freely (only
 * checking 2x2), then fix room sizes afterwards.
 * 
 * Algorithm:
 * 1. Grow a connected black tree from random start, only checking 2x2
 * 2. Split large rooms by adding more black cells
 * 3. Merge tiny rooms by removing black cells
 * 4. Repeat until all constraints satisfied
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, targetBlack: 0.44, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, targetBlack: 0.48, count: 1000 },
  hard:   { size: 10, maxRoom: 6, minRoom: 1, targetBlack: 0.52, count: 1000 },
};

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

function wouldCreate2x2(grid, size, r, c) {
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      let count = 0;
      if (grid[r0][c0] === 1) count++;
      if (grid[r0][c0+1] === 1) count++;
      if (grid[r0+1][c0] === 1) count++;
      // (r,c) would be the 4th cell
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

function generatePuzzle(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 200; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Step 1: Grow black tree (only check 2x2, fast)
    const blackTarget = Math.floor(total * (targetBlack + Math.random() * 0.06));
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    let blackCount = 1;
    
    // Maintain frontier (white cells adjacent to black)
    let frontierSet = new Set();
    for (const [nr, nc] of neighbors(startR, startC, size)) {
      frontierSet.add(nr * size + nc);
    }
    
    let stuck = 0;
    while (blackCount < blackTarget && stuck < 100) {
      const frontier = shuffle([...frontierSet]);
      let placed = false;
      for (const key of frontier) {
        const r = Math.floor(key / size), c = key % size;
        if (wouldCreate2x2(grid, size, r, c)) continue;
        
        grid[r][c] = 1;
        blackCount++;
        frontierSet.delete(key);
        for (const [nr, nc] of neighbors(r, c, size)) {
          if (grid[nr][nc] === 0) frontierSet.add(nr * size + nc);
        }
        placed = true;
        break;
      }
      if (!placed) stuck++;
    }
    
    // Step 2: Split large rooms by adding black cells
    for (let pass = 0; pass < 300; pass++) {
      const components = getAllWhiteComponents(grid, size);
      const bigRooms = components.filter(c => c.length > maxRoom);
      if (bigRooms.length === 0) break;
      
      const room = bigRooms[Math.floor(Math.random() * bigRooms.length)];
      // Find cells in this room adjacent to existing black
      const borderCells = room.filter(([r, c]) =>
        neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)
      );
      
      if (borderCells.length === 0) continue;
      shuffle(borderCells);
      
      let split = false;
      for (const [r, c] of borderCells) {
        if (wouldCreate2x2(grid, size, r, c)) continue;
        grid[r][c] = 1;
        // Verify black stays connected (adding a cell adjacent to existing black always stays connected)
        split = true;
        break;
      }
      if (!split) break; // Can't split this room
    }
    
    // Step 3: Merge small rooms by removing black cells
    for (let pass = 0; pass < 100; pass++) {
      const components = getAllWhiteComponents(grid, size);
      const smallRooms = components.filter(c => c.length < minRoom);
      if (smallRooms.length === 0) break;
      
      const room = smallRooms[0];
      const borderBlacks = new Set();
      for (const [r, c] of room) {
        for (const [nr, nc] of neighbors(r, c, size)) {
          if (grid[nr][nc] === 1) borderBlacks.add(nr * size + nc);
        }
      }
      
      let merged = false;
      for (const key of shuffle([...borderBlacks])) {
        const br = Math.floor(key / size), bc = key % size;
        grid[br][bc] = 0;
        if (has2x2Black(grid, size) || !checkBlackConnected(grid, size)) {
          grid[br][bc] = 1;
          continue;
        }
        // Check resulting room size
        const newComps = getAllWhiteComponents(grid, size);
        const mergedRoom = newComps.find(comp => comp.some(([cr,cc]) => cr===room[0][0] && cc===room[0][1]));
        if (mergedRoom && mergedRoom.length <= maxRoom) {
          merged = true;
          break;
        }
        grid[br][bc] = 1;
      }
      if (!merged) break;
    }
    
    // Final validation
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
    const components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom || comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Assign numbers
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const comp of components) {
      const idx = Math.floor(Math.random() * comp.length);
      const [nr, nc] = comp[idx];
      puzzleGrid[nr][nc] = comp.length;
    }
    
    return { size, grid: puzzleGrid, solution: grid.map(r => [...r]) };
  }
  return null;
}

// Main
for (const [diff, config] of Object.entries(CONFIGS)) {
  console.log(`\n=== Generating ${diff} (${config.size}×${config.size}, ${config.count} puzzles) ===`);
  let generated = 0, failed = 0;
  const startTime = Date.now();
  
  for (let i = 1; i <= config.count; i++) {
    const puzzle = generatePuzzle(config);
    if (!puzzle) {
      failed++;
      i--;
      if (failed > 500) { console.log(`  Too many failures at ${generated}, stopping`); break; }
      continue;
    }
    
    const id = String(i).padStart(4, '0');
    const fp = path.join(DIR, `${diff}-${id}.json`);
    fs.writeFileSync(fp, JSON.stringify(puzzle));
    generated++;
    
    if (generated % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${generated}/${config.count} (${elapsed}s)`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Done: ${generated} in ${elapsed}s (failed: ${failed})`);
}

console.log('\n✅ All done!');
