/**
 * Nurikabe Puzzle Generator v3
 * 
 * Fast strategy:
 * 1. Generate a random spanning tree on the grid -> this gives connected black cells
 * 2. Prune tree leaves until black count is reasonable
 * 3. White regions between black tree branches form rooms
 * 4. Check room sizes, adjust if needed
 * 
 * Actually, simpler approach that works:
 * 1. Start with a random black path (snake) that's connected
 * 2. Fill in more black cells avoiding 2x2
 * 3. The remaining white areas form rooms
 * 4. Verify and assign numbers
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, count: 1000 },
  hard:   { size: 10, maxRoom: 6, minRoom: 1, count: 1000 },
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

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  
  for (let attempt = 0; attempt < 300; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0)); // 0=white, 1=black
    const total = size * size;
    // Target: ~40-55% black cells
    const blackTarget = Math.floor(total * (0.40 + Math.random() * 0.15));
    
    // Step 1: Create a connected black structure using random walk
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    let blackCount = 1;
    let frontier = [[startR, startC]];
    
    while (blackCount < blackTarget && frontier.length > 0) {
      // Pick a random frontier cell and try to expand
      const fi = Math.floor(Math.random() * frontier.length);
      const [fr, fc] = frontier[fi];
      
      const adj = shuffle(neighbors(fr, fc, size));
      let expanded = false;
      for (const [nr, nc] of adj) {
        if (grid[nr][nc] === 1) continue;
        // Try placing black
        grid[nr][nc] = 1;
        // Check 2x2
        let has22 = false;
        for (let r = Math.max(0, nr-1); r <= Math.min(size-2, nr); r++) {
          for (let c = Math.max(0, nc-1); c <= Math.min(size-2, nc); c++) {
            if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
              has22 = true; break;
            }
          }
          if (has22) break;
        }
        if (has22) {
          grid[nr][nc] = 0;
          continue;
        }
        
        // Check white rooms don't exceed maxRoom
        // Quick check: only check components touching (nr,nc)
        let tooBig = false;
        for (const [wr, wc] of neighbors(nr, nc, size)) {
          if (grid[wr][wc] === 0) {
            const compSize = bfsWhiteComponent(grid, size, wr, wc);
            if (compSize > maxRoom) { tooBig = true; break; }
          }
        }
        if (tooBig) {
          grid[nr][nc] = 0;
          continue;
        }
        
        frontier.push([nr, nc]);
        blackCount++;
        expanded = true;
        break;
      }
      
      if (!expanded) {
        // Remove exhausted frontier cell (but keep it black)
        frontier.splice(fi, 1);
      }
    }
    
    // Step 2: Check all white room sizes
    const components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom || comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Step 3: Verify black connectivity
    if (!checkBlackConnected(grid, size)) continue;
    
    // Step 4: Assign numbers
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const comp of components) {
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
  console.log(`  Done: ${generated} in ${elapsed}s (failed attempts: ${failed})`);
}

console.log('\n✅ All done!');
