/**
 * Nurikabe Puzzle Generator v6
 * 
 * Key insight: Build the BLACK tree FIRST (guaranteed connected, no 2x2),
 * then the white rooms between branches are automatically bounded.
 * 
 * Algorithm:
 * 1. Generate a random spanning tree of black cells on the grid
 * 2. The tree naturally divides white space into bounded rooms
 * 3. Check room sizes; if too big, extend tree branches
 * 4. Assign numbers to rooms
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 2, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 2, count: 1000 },
  hard:   { size: 10, maxRoom: 8, minRoom: 2, count: 1000 },
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

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Step 1: Build a random black tree using Wilson's algorithm variant
    // Actually, let's use a simpler approach: random DFS tree
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    
    // Use Prim's-like random tree growing
    const inTree = new Set([startR * size + startC]);
    const edges = [];
    for (const [nr, nc] of neighbors(startR, startC, size)) {
      edges.push([startR, startC, nr, nc]);
    }
    
    const blackCells = [[startR, startC]];
    
    // Target: fill ~40-55% of grid with black tree
    const blackPct = size <= 5 ? 0.45 : size <= 7 ? 0.48 : 0.52;
    const blackTarget = Math.floor(total * (blackPct + Math.random() * 0.08));
    
    while (blackCells.length < blackTarget && edges.length > 0) {
      // Pick random edge
      const ei = Math.floor(Math.random() * edges.length);
      const [fr, fc, tr, tc] = edges[ei];
      
      if (inTree.has(tr * size + tc)) {
        // Already in tree, remove edge
        edges.splice(ei, 1);
        continue;
      }
      
      // Check 2x2 constraint
      grid[tr][tc] = 1;
      if (has2x2Black(grid, size)) {
        grid[tr][tc] = 0;
        edges.splice(ei, 1);
        continue;
      }
      
      // Add to tree
      inTree.add(tr * size + tc);
      blackCells.push([tr, tc]);
      
      // Add new edges
      for (const [nr, nc] of neighbors(tr, tc, size)) {
        if (!inTree.has(nr * size + nc)) {
          edges.push([tr, tc, nr, nc]);
        }
      }
      
      edges.splice(ei, 1);
    }
    
    // Step 2: Now check white rooms
    let components = getAllWhiteComponents(grid, size);
    
    // Try to split rooms that are too big by extending the tree
    let bigRooms = components.filter(c => c.length > maxRoom);
    let extensionAttempts = 0;
    
    while (bigRooms.length > 0 && extensionAttempts < 100) {
      extensionAttempts++;
      const room = bigRooms[0];
      
      // Find a cell in this room that is adjacent to an existing black cell
      // (so adding it keeps the tree connected)
      const borderCells = room.filter(([r, c]) => 
        neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)
      );
      
      if (borderCells.length === 0) { break; }
      
      shuffle(borderCells);
      let extended = false;
      for (const [r, c] of borderCells) {
        grid[r][c] = 1;
        if (has2x2Black(grid, size)) { grid[r][c] = 0; continue; }
        // Still connected (we added to existing tree)
        extended = true;
        break;
      }
      
      if (!extended) break;
      
      components = getAllWhiteComponents(grid, size);
      bigRooms = components.filter(c => c.length > maxRoom);
    }
    
    // Final validation
    components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom || comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    if (has2x2Black(grid, size)) continue;
    
    // Black is connected by construction (it's a tree!)
    // But let's verify in case 2x2 fix broke something
    // (it shouldn't since we check before adding)
    
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
