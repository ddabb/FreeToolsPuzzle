/**
 * Nurikabe Puzzle Generator v8
 * 
 * Strategy: Use a checkerboard-like black skeleton that naturally avoids 2x2,
 * then selectively remove some black cells to create rooms of desired sizes.
 * 
 * Key insight: A "thickened checkerboard" pattern where black cells are placed
 * on a grid with spacing guarantees no 2x2 blocks and naturally limits room sizes.
 * 
 * For size N:
 * - Place black cells on every other row AND every other column
 * - This creates a "grid" of black lines
 * - Rooms are bounded by these lines
 * - Then remove some black cells to merge small rooms into target sizes
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
  
  for (let attempt = 0; attempt < 300; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Step 1: Create grid-line black pattern
    // Place black on every `spacing`-th row and column
    const spacing = size <= 5 ? 3 : size <= 7 ? 3 : 3;
    
    // Horizontal black lines (every `spacing` rows, offset randomly)
    const hOffset = Math.floor(Math.random() * spacing);
    for (let r = hOffset; r < size; r += spacing) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = 1;
      }
    }
    
    // Vertical black lines (every `spacing` cols, offset randomly)
    const vOffset = Math.floor(Math.random() * spacing);
    for (let c = vOffset; c < size; c += spacing) {
      for (let r = 0; r < size; r++) {
        grid[r][c] = 1;
      }
    }
    
    // This creates a grid pattern. Check for 2x2 blocks at intersections.
    // At intersection of h-line and v-line, we get 2x2 if lines are adjacent.
    // Fix: at intersections, remove one cell
    if (has2x2Black(grid, size)) {
      // Remove cells at intersections to break 2x2
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            // Remove the bottom-right cell of the 2x2
            grid[r+1][c+1] = 0;
          }
        }
      }
    }
    
    // Step 2: Check if black is connected. If not, add connecting cells.
    if (!checkBlackConnected(grid, size)) {
      // Find black components and connect them
      // Add black cells to bridge components
      const visited = Array.from({length: size}, () => Array(size).fill(false));
      const components = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (visited[r][c] || grid[r][c] !== 1) continue;
          const cells = [];
          const queue = [[r, c]];
          visited[r][c] = true;
          while (queue.length) {
            const [cr, cc] = queue.shift();
            cells.push([cr, cc]);
            for (const [nr, nc] of neighbors(cr, cc, size)) {
              if (!visited[nr][nc] && grid[nr][nc] === 1) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }
          components.push(cells);
        }
      }
      
      // Connect components by adding bridge cells
      // Sort by size (largest first = keep as base)
      components.sort((a, b) => b.length - a.length);
      
      for (let ci = 1; ci < components.length; ci++) {
        const target = new Set(components[0].map(([r,c]) => r*size+c));
        const source = components[ci];
        
        // BFS from source looking for shortest path to target through white cells
        const bfsVisited = new Set(source.map(([r,c]) => r*size+c));
        const bfsQueue = source.map(([r,c]) => ({r, c, path: []}));
        
        let found = false;
        while (bfsQueue.length && !found) {
          const {r, c, path} = bfsQueue.shift();
          for (const [nr, nc] of neighbors(r, c, size)) {
            const key = nr * size + nc;
            if (bfsVisited.has(key)) continue;
            bfsVisited.add(key);
            
            const newPath = [...path, [nr, nc]];
            
            if (target.has(key)) {
              // Bridge found! Convert path cells to black
              for (const [pr, pc] of newPath) {
                grid[pr][pc] = 1;
              }
              found = true;
              break;
            }
            
            if (grid[nr][nc] === 0) {
              bfsQueue.push({r: nr, c: nc, path: newPath});
            }
          }
        }
        if (!found) break;
      }
      
      // Recheck 2x2 after adding bridges
      if (has2x2Black(grid, size)) {
        // Try to fix by removing one cell from each 2x2
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
              // Try removing each cell, pick one that keeps black connected
              const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
              let fixed = false;
              for (const [br, bc] of candidates) {
                grid[br][bc] = 0;
                if (checkBlackConnected(grid, size) && !has2x2Black(grid, size)) {
                  fixed = true;
                  break;
                }
                grid[br][bc] = 1;
              }
            }
          }
        }
      }
    }
    
    // Step 3: Now merge small rooms by removing black cells
    let components = getAllWhiteComponents(grid, size);
    
    // Merge rooms that are too small by removing black cells between them
    let mergeAttempts = 0;
    while (mergeAttempts < 200) {
      mergeAttempts++;
      components = getAllWhiteComponents(grid, size);
      const smallRooms = components.filter(c => c.length < minRoom);
      if (smallRooms.length === 0) break;
      
      const room = smallRooms[0];
      // Find black cells adjacent to this room
      const borderBlacks = new Set();
      for (const [r, c] of room) {
        for (const [nr, nc] of neighbors(r, c, size)) {
          if (grid[nr][nc] === 1) borderBlacks.add(nr * size + nc);
        }
      }
      
      // Try removing a border black cell to merge with an adjacent room
      let merged = false;
      for (const key of shuffle([...borderBlacks])) {
        const br = Math.floor(key / size), bc = key % size;
        grid[br][bc] = 0;
        if (checkBlackConnected(grid, size) && !has2x2Black(grid, size)) {
          // Check if merged room doesn't exceed maxRoom
          const newComponents = getAllWhiteComponents(grid, size);
          const mergedRoom = newComponents.find(c => c.some(([cr,cc]) => cr===room[0][0] && cc===room[0][1]));
          if (mergedRoom && mergedRoom.length <= maxRoom) {
            merged = true;
            break;
          }
        }
        grid[br][bc] = 1;
      }
      if (!merged) break;
    }
    
    // Step 4: Also split rooms that are too big by adding black cells
    components = getAllWhiteComponents(grid, size);
    let bigRooms = components.filter(c => c.length > maxRoom);
    let splitAttempts = 0;
    
    while (bigRooms.length > 0 && splitAttempts < 100) {
      splitAttempts++;
      const room = bigRooms[0];
      
      // Find cells in room adjacent to black
      const borderCells = room.filter(([r, c]) => 
        neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)
      );
      
      shuffle(borderCells);
      let split = false;
      for (const [r, c] of borderCells) {
        grid[r][c] = 1;
        if (has2x2Black(grid, size)) { grid[r][c] = 0; continue; }
        if (!checkBlackConnected(grid, size)) { grid[r][c] = 0; continue; }
        split = true;
        break;
      }
      
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
