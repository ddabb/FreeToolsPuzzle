/**
 * Nurikabe Puzzle Generator v7
 * 
 * For large grids, use a different approach:
 * 1. Generate a Hamiltonian-like path through the grid (no 2x2 by nature)
 * 2. Prune random branches from the path
 * 3. The remaining black path is connected and 2x2-free
 * 4. Check room sizes
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

/**
 * Generate a snake-like path that covers much of the grid.
 * Snake pattern: alternate left-right per row.
 */
function generateSnakePath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push([r, c]);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  return path;
}

/**
 * Generate a random path using DFS with Warnsdorff-like heuristic.
 */
function generateRandomPath(size) {
  const visited = Array.from({length: size}, () => Array(size).fill(false));
  const path = [];
  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);
  
  function dfs(r, c) {
    visited[r][c] = true;
    path.push([r, c]);
    
    const adj = shuffle(neighbors(r, c, size));
    // Sort by fewest unvisited neighbors (Warnsdorff)
    adj.sort((a, b) => {
      const na = neighbors(a[0], a[1], size).filter(([nr,nc]) => !visited[nr][nc]).length;
      const nb = neighbors(b[0], b[1], size).filter(([nr,nc]) => !visited[nr][nc]).length;
      return na - nb;
    });
    
    for (const [nr, nc] of adj) {
      if (!visited[nr][nc]) {
        dfs(nr, nc);
        return; // Only go down one path
      }
    }
  }
  
  dfs(startR, startC);
  return path;
}

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Step 1: Generate a long random path as black backbone
    // The path is guaranteed 2x2-free (it's a single-cell-wide path)
    const blackPath = generateRandomPath(size);
    
    // We want ~45-55% black cells
    const blackPct = size <= 5 ? 0.47 : size <= 7 ? 0.50 : 0.53;
    const blackTarget = Math.floor(total * (blackPct + Math.random() * 0.08));
    
    // Take first blackTarget cells from the path as black
    const blackCells = blackPath.slice(0, Math.min(blackTarget, blackPath.length));
    for (const [r, c] of blackCells) {
      grid[r][c] = 1;
    }
    
    // The path is connected by construction. But truncated path may not stay connected
    // if we just take first N cells. Need to verify.
    // Actually, the DFS path IS connected as a chain.
    // But if we take the first N cells, the chain is [0..N-1] which is connected.
    
    // Step 2: Check white rooms
    let components = getAllWhiteComponents(grid, size);
    
    // Split big rooms by extending black
    let bigRooms = components.filter(c => c.length > maxRoom);
    let extAttempts = 0;
    
    while (bigRooms.length > 0 && extAttempts < 200) {
      extAttempts++;
      const room = bigRooms[0];
      
      // Find border cells (white cells adjacent to black)
      const borderCells = room.filter(([r, c]) => 
        neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)
      );
      
      if (borderCells.length === 0) break;
      
      shuffle(borderCells);
      let extended = false;
      for (const [r, c] of borderCells) {
        grid[r][c] = 1;
        if (has2x2Black(grid, size)) { grid[r][c] = 0; continue; }
        extended = true;
        break;
      }
      
      if (!extended) break;
      
      components = getAllWhiteComponents(grid, size);
      bigRooms = components.filter(c => c.length > maxRoom);
    }
    
    // Step 3: Merge small rooms (size 1) by removing adjacent black cells
    // But only if removing black keeps connectivity
    // Actually, minRoom=2 means size-1 rooms are invalid. Let's try to fix them.
    components = getAllWhiteComponents(grid, size);
    const smallRooms = components.filter(c => c.length < minRoom);
    
    for (const room of smallRooms) {
      // Find a black neighbor to flip white, merging with adjacent room
      for (const [r, c] of room) {
        const blackAdj = neighbors(r, c, size).filter(([nr, nc]) => grid[nr][nc] === 1);
        shuffle(blackAdj);
        let merged = false;
        for (const [br, bc] of blackAdj) {
          grid[br][bc] = 0;
          // Check if black is still connected
          let blackOk = true;
          let bc2 = 0, first = null;
          for (let rr = 0; rr < size; rr++)
            for (let cc = 0; cc < size; cc++)
              if (grid[rr][cc] === 1) { bc2++; if (!first) first = [rr,cc]; }
          
          if (bc2 > 0 && first) {
            const vis = new Set();
            const q = [first];
            vis.add(first[0]*size+first[1]);
            while (q.length) {
              const [cr,cc] = q.shift();
              for (const [nr,nc] of neighbors(cr,cc,size)) {
                const k = nr*size+nc;
                if (!vis.has(k) && grid[nr][nc]===1) { vis.add(k); q.push([nr,nc]); }
              }
            }
            if (vis.size !== bc2) blackOk = false;
          }
          
          if (blackOk && !has2x2Black(grid, size)) {
            merged = true;
            break;
          } else {
            grid[br][bc] = 1; // revert
          }
        }
        if (merged) break;
      }
    }
    
    // Final validation
    components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom || comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    if (has2x2Black(grid, size)) continue;
    
    // Verify black connected
    let blackCount = 0, firstBlack = null;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c] === 1) { blackCount++; if (!firstBlack) firstBlack = [r,c]; }
    if (blackCount === 0) continue;
    const bv = new Set();
    const bq = [firstBlack];
    bv.add(firstBlack[0]*size+firstBlack[1]);
    while (bq.length) {
      const [r,c] = bq.shift();
      for (const [nr,nc] of neighbors(r,c,size)) {
        const k = nr*size+nc;
        if (!bv.has(k) && grid[nr][nc]===1) { bv.add(k); bq.push([nr,nc]); }
      }
    }
    if (bv.size !== blackCount) continue;
    
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
