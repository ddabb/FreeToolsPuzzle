/**
 * Nurikabe Puzzle Generator v9
 * 
 * Strategy: "Sparse tree" - grow a connected black tree cell by cell,
 * checking 2x2 and room size constraints as we go.
 * 
 * Key improvement over v7: Instead of path-then-prune, we grow the black
 * region incrementally, which gives us fine-grained control over room sizes.
 * 
 * Algorithm:
 * 1. Start with one random black cell
 * 2. Repeatedly add a random neighbor of existing black cells
 * 3. Before adding, verify: no 2x2, resulting white rooms <= maxRoom
 * 4. Stop when target black percentage is reached (or close)
 * 5. If rooms too small, merge by removing black cells
 * 6. Assign room numbers
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

function has2x2At(grid, size, r, c) {
  // Check if placing black at (r,c) creates a 2x2
  // Check all 4 possible 2x2 squares that include (r,c)
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      if (grid[r0][c0]===1 && grid[r0][c0+1]===1 && grid[r0+1][c0]===1 && grid[r0+1][c0+1]===1)
        return true;
    }
  }
  // Also check with the cell we're about to place
  grid[r][c] = 1;
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      if (grid[r0][c0]===1 && grid[r0][c0+1]===1 && grid[r0+1][c0]===1 && grid[r0+1][c0+1]===1) {
        grid[r][c] = 0;
        return true;
      }
    }
  }
  grid[r][c] = 0;
  return false;
}

function getMaxWhiteRoom(grid, size, r, c) {
  // Temporarily place black at (r,c) and check max white room size
  grid[r][c] = 1;
  const visited = Array.from({length: size}, () => Array(size).fill(false));
  let maxRoom = 0;
  for (let rr = 0; rr < size; rr++) {
    for (let cc = 0; cc < size; cc++) {
      if (visited[rr][cc] || grid[rr][cc] === 1) continue;
      let roomSize = 0;
      const queue = [[rr, cc]];
      visited[rr][cc] = true;
      while (queue.length) {
        const [cr, ccc] = queue.shift();
        roomSize++;
        for (const [nr, nc] of neighbors(cr, ccc, size)) {
          if (!visited[nr][nc] && grid[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
      maxRoom = Math.max(maxRoom, roomSize);
    }
  }
  grid[r][c] = 0;
  return maxRoom;
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

function has2x2Black(grid, size) {
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1)
        return true;
  return false;
}

function generatePuzzle(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  const blackTarget = Math.floor(total * (targetBlack + Math.random() * 0.06));
  
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Start with a random cell
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    
    let blackCount = 1;
    let stuckCount = 0;
    
    while (blackCount < blackTarget && stuckCount < 500) {
      // Find all white cells adjacent to existing black cells (frontier)
      const frontier = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === 0 && neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)) {
            frontier.push([r, c]);
          }
        }
      }
      
      if (frontier.length === 0) break;
      
      shuffle(frontier);
      
      let placed = false;
      for (const [r, c] of frontier) {
        // Check 2x2
        if (has2x2At(grid, size, r, c)) continue;
        
        // Check max room size after placing
        const maxR = getMaxWhiteRoom(grid, size, r, c);
        if (maxR > maxRoom) continue;
        
        // Place it
        grid[r][c] = 1;
        blackCount++;
        placed = true;
        break;
      }
      
      if (!placed) stuckCount++;
    }
    
    if (blackCount < blackTarget * 0.7) continue; // Too few black cells
    
    // Check validity
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
    let components = getAllWhiteComponents(grid, size);
    
    // Merge rooms that are too small (size < minRoom) by removing black cells
    let mergePasses = 0;
    while (mergePasses < 100) {
      mergePasses++;
      components = getAllWhiteComponents(grid, size);
      const smallRooms = components.filter(c => c.length < minRoom);
      if (smallRooms.length === 0) break;
      
      const room = smallRooms[0];
      // Find black neighbors of this room
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
        if (!has2x2Black(grid, size) && checkBlackConnected(grid, size)) {
          // Check merged room size
          const newComps = getAllWhiteComponents(grid, size);
          const mergedRoom = newComps.find(c => c.some(([cr,cc]) => cr===room[0][0] && cc===room[0][1]));
          if (mergedRoom && mergedRoom.length <= maxRoom) {
            merged = true;
            break;
          }
        }
        grid[br][bc] = 1;
      }
      if (!merged) break;
    }
    
    // Final validation
    components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom) { valid = false; break; }
      if (comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
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
      if (failed > 1000) { console.log(`  Too many failures at ${generated}, stopping`); break; }
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
