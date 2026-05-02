/**
 * Nurikabe Puzzle Generator v4
 * 
 * Strategy: 
 * 1. Generate a random connected black tree (spanning-tree-like)
 * 2. Check final constraints (room size, 2x2, etc)
 * 3. If rooms too big, add more black cells to split them
 * 4. If rooms too small, remove some black cells to merge them
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

function has2x2Black(grid, size) {
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++)
      if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1)
        return true;
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

function checkBlackConnected(grid, size) {
  let first = null, count = 0;
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
      const key = nr * size + nc;
      if (!visited.has(key) && grid[nr][nc] === 1) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return visited.size === count;
}

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Step 1: Build connected black structure via random walk
    // Start from random cell, do a random walk placing black cells
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    let cur = [startR, startC];
    const blackCells = [[startR, startC]];
    
    // Target: enough black cells to split rooms into reasonable sizes
    // Rough: total/maxRoom gives minimum rooms, each room needs at least 1 black border
    const blackTarget = Math.floor(total * (0.40 + Math.random() * 0.10));
    
    while (blackCells.length < blackTarget) {
      const [cr, cc] = cur;
      const adj = shuffle(neighbors(cr, cc, size));
      
      // Try to move to an adjacent white cell
      let moved = false;
      for (const [nr, nc] of adj) {
        if (grid[nr][nc] === 1) continue;
        // Check 2x2
        grid[nr][nc] = 1;
        if (has2x2Black(grid, size)) {
          grid[nr][nc] = 0;
          continue;
        }
        grid[nr][nc] = 1;
        blackCells.push([nr, nc]);
        cur = [nr, nc];
        moved = true;
        break;
      }
      
      if (!moved) {
        // Jump to a random black cell and try from there
        cur = blackCells[Math.floor(Math.random() * blackCells.length)];
      }
    }
    
    // Step 2: Check and fix
    if (!checkBlackConnected(grid, size)) continue;
    if (has2x2Black(grid, size)) continue;
    
    let components = getAllWhiteComponents(grid, size);
    
    // If any room is too big, try to split it by adding more black cells
    let bigRooms = components.filter(c => c.length > maxRoom);
    let splitAttempts = 0;
    while (bigRooms.length > 0 && splitAttempts < 50) {
      splitAttempts++;
      const room = bigRooms[0];
      // Try to find a cell in this room where placing black would split it
      // and not violate 2x2 or black connectivity
      shuffle(room);
      let split = false;
      for (const [r, c] of room) {
        grid[r][c] = 1;
        if (has2x2Black(grid, size)) { grid[r][c] = 0; continue; }
        if (!checkBlackConnected(grid, size)) { grid[r][c] = 0; continue; }
        split = true;
        break;
      }
      if (!split) break;
      components = getAllWhiteComponents(grid, size);
      bigRooms = components.filter(c => c.length > maxRoom);
    }
    
    // Final check
    components = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const comp of components) {
      if (comp.length > maxRoom || comp.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    if (!checkBlackConnected(grid, size)) continue;
    if (has2x2Black(grid, size)) continue;
    
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
