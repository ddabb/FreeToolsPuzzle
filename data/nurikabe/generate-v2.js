/**
 * Nurikabe Puzzle Generator v2
 * 
 * Better strategy: Build the solution (black/white pattern) first,
 * then assign numbers to white rooms.
 * 
 * Algorithm:
 * 1. Start with all white grid
 * 2. Place black cells one by one, respecting constraints:
 *    - No 2x2 all-black blocks
 *    - Black cells must stay connected (or will be connected)
 *    - White rooms must not exceed maxRoom size
 *    - Each white room will eventually need exactly 1 number
 * 3. Continue until white rooms are all within target size range
 * 4. Assign numbers to rooms
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 2, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 2, count: 1000 },
  hard:   { size: 10, maxRoom: 6, minRoom: 2, count: 1000 },
};

function neighbors(r, c, size) {
  const n = [];
  if (r > 0) n.push([r-1, c]);
  if (r < size-1) n.push([r+1, c]);
  if (c > 0) n.push([r, c-1]);
  if (c < size-1) n.push([r, c+1]);
  return n;
}

function getWhiteComponents(grid, size) {
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
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (grid[r][c] === 1 && grid[r][c+1] === 1 &&
          grid[r+1][c] === 1 && grid[r+1][c+1] === 1) return true;
    }
  }
  return false;
}

function isBlackConnected(grid, size) {
  let blackCount = 0, firstBlack = null;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) {
        blackCount++;
        if (!firstBlack) firstBlack = [r, c];
      }
    }
  }
  if (blackCount === 0) return true;
  const visited = new Set();
  const queue = [firstBlack];
  visited.add(firstBlack[0] * size + firstBlack[1]);
  while (queue.length) {
    const [cr, cc] = queue.shift();
    for (const [nr, nc] of neighbors(cr, cc, size)) {
      const key = nr * size + nc;
      if (!visited.has(key) && grid[nr][nc] === 1) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size === blackCount;
}

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    // Strategy: Build solution by iteratively placing black cells
    const grid = Array.from({length: size}, () => Array(size).fill(0)); // 0=white
    const blackCells = [];
    
    // Randomly decide how many black cells to place
    // More black = smaller rooms = harder puzzle
    const blackTarget = Math.floor(total * (0.35 + Math.random() * 0.15));
    
    // Get candidate cells (shuffle all positions)
    const candidates = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        candidates.push([r, c]);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    
    for (const [r, c] of candidates) {
      if (blackCells.length >= blackTarget) break;
      
      // Try placing black at (r,c)
      grid[r][c] = 1;
      
      // Check 2x2 black
      if (has2x2Black(grid, size)) {
        grid[r][c] = 0;
        continue;
      }
      
      // Check no white room exceeds maxRoom
      const components = getWhiteComponents(grid, size);
      let tooBig = false;
      for (const comp of components) {
        if (comp.length > maxRoom) { tooBig = true; break; }
      }
      if (tooBig) {
        grid[r][c] = 0;
        continue;
      }
      
      blackCells.push([r, c]);
    }
    
    // Check final state
    const components = getWhiteComponents(grid, size);
    
    // All rooms must be within [minRoom, maxRoom]
    let valid = true;
    for (const comp of components) {
      if (comp.length < minRoom || comp.length > maxRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Black must be connected
    if (!isBlackConnected(grid, size)) continue;
    
    // Assign numbers: each room gets 1 number = room size
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const comp of components) {
      // Pick a random cell in the room for the number
      const idx = Math.floor(Math.random() * comp.length);
      const [nr, nc] = comp[idx];
      puzzleGrid[nr][nc] = comp.length;
    }
    
    return {
      size,
      grid: puzzleGrid,
      solution: grid.map(r => [...r]),
    };
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
    
    if (i % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${i}/${config.count} (${elapsed}s)`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Done in ${elapsed}s`);
}

console.log('\n✅ All done!');
