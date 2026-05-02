/**
 * Nurikabe Puzzle Generator v5
 * 
 * Top-down approach: Build valid solution, then extract puzzle.
 * 
 * Algorithm:
 * 1. Partition grid into rooms of size [minRoom, maxRoom] using flood-fill growth
 * 2. Mark all room boundary cells as black
 * 3. Connect all black cells (add black bridges between rooms if needed)
 * 4. Check no 2x2 black, adjust if needed
 * 5. Assign numbers to rooms
 * 
 * This guarantees valid solution by construction.
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

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  
  for (let attempt = 0; attempt < 200; attempt++) {
    // Step 1: Room partitioning
    // Use Voronoi-like approach: seed room centers, grow them
    const roomMap = Array.from({length: size}, () => Array(size).fill(-1)); // room index
    const rooms = []; // rooms[i] = list of [r,c]
    const seeds = [];
    
    // Decide number of rooms based on grid size and room size range
    const total = size * size;
    const avgRoom = (minRoom + maxRoom) / 2;
    const numRooms = Math.round(total / avgRoom * 0.55); // ~55% white, 45% black
    
    // Place seeds with minimum distance
    const allCells = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        allCells.push([r, c]);
    shuffle(allCells);
    
    for (let i = 0; i < numRooms && i < allCells.length; i++) {
      const [r, c] = allCells[i];
      seeds.push([r, c]);
      roomMap[r][c] = i;
      rooms.push([[r, c]]);
    }
    
    // Grow rooms round-robin until they reach target size or can't grow
    const targetSizes = rooms.map(() => minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1)));
    const grown = new Set(seeds.map(([r,c]) => r*size+c));
    let frontier = seeds.map((s, i) => ({idx: i, cells: [s]}));
    
    for (let round = 0; round < size * 4; round++) {
      const order = shuffle([...Array(numRooms).keys()]);
      for (const i of order) {
        if (rooms[i].length >= targetSizes[i]) continue;
        
        // Try to grow room i from a random cell in the room
        const cells = shuffle([...rooms[i]]);
        let expanded = false;
        for (const [cr, cc] of cells) {
          if (expanded) break;
          const adj = shuffle(neighbors(cr, cc, size));
          for (const [nr, nc] of adj) {
            const key = nr * size + nc;
            if (grown.has(key)) continue;
            grown.add(key);
            roomMap[nr][nc] = i;
            rooms[i].push([nr, nc]);
            expanded = true;
            break;
          }
        }
      }
    }
    
    // Step 2: Cells not assigned to any room become black
    const grid = Array.from({length: size}, () => Array(size).fill(1)); // default black
    for (const room of rooms) {
      for (const [r, c] of room) {
        grid[r][c] = 0; // white
      }
    }
    
    // Step 3: Check black connectivity
    // Find black components, if disconnected, connect them by converting white cells to black
    const blackComponents = [];
    const visited = Array.from({length: size}, () => Array(size).fill(false));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (visited[r][c] || grid[r][c] !== 1) continue;
        const comp = [];
        const queue = [[r, c]];
        visited[r][c] = true;
        while (queue.length) {
          const [cr, cc] = queue.shift();
          comp.push([cr, cc]);
          for (const [nr, nc] of neighbors(cr, cc, size)) {
            if (!visited[nr][nc] && grid[nr][nc] === 1) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
        blackComponents.push(comp);
      }
    }
    
    if (blackComponents.length > 1) {
      // Try to connect black components by flipping white cells to black
      // Use BFS from each component to find shortest path to another
      let connected = false;
      for (let ci = 1; ci < blackComponents.length; ci++) {
        const target = new Set(blackComponents[0].map(([r,c]) => r*size+c));
        // BFS from component ci looking for path to component 0
        const bfsVisited = new Set();
        const bfsQueue = []; // [r, c, path]
        for (const [r, c] of blackComponents[ci]) {
          bfsQueue.push([r, c, []]);
          bfsVisited.add(r * size + c);
        }
        
        while (bfsQueue.length && !connected) {
          const [r, c, path] = bfsQueue.shift();
          for (const [nr, nc] of neighbors(r, c, size)) {
            const key = nr * size + nc;
            if (bfsVisited.has(key)) continue;
            bfsVisited.add(key);
            
            if (target.has(key)) {
              // Found path! Convert white cells in path to black
              for (const [pr, pc] of path) {
                if (grid[pr][pc] === 0) {
                  grid[pr][pc] = 1;
                  // Remove from room
                  const ri = roomMap[pr][pc];
                  if (ri >= 0) {
                    rooms[ri] = rooms[ri].filter(([rr,rc]) => !(rr===pr && rc===pc));
                  }
                  roomMap[pr][pc] = -1;
                }
              }
              connected = true;
              break;
            }
            
            if (grid[nr][nc] === 0) {
              bfsQueue.push([nr, nc, [...path, [nr, nc]]]);
            }
          }
        }
        if (!connected) break;
      }
    }
    
    // Step 4: Check 2x2 black blocks and fix them
    // Convert one cell in each 2x2 black block to white (add to an adjacent room)
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
          // Find the cell with the most white neighbors (best candidate to flip)
          const candidates = [[r,c],[r,c+1],[r+1,c],[r+1,c+1]];
          let best = null, bestScore = -1;
          for (const [br, bc] of candidates) {
            let whiteAdj = 0;
            for (const [nr, nc] of neighbors(br, bc, size)) {
              if (grid[nr][nc] === 0) whiteAdj++;
            }
            if (whiteAdj > bestScore) { bestScore = whiteAdj; best = [br, bc]; }
          }
          if (best && bestScore > 0) {
            const [br, bc] = best;
            grid[br][bc] = 0;
            // Add to adjacent room
            for (const [nr, nc] of neighbors(br, bc, size)) {
              const ri = roomMap[nr][nc];
              if (ri >= 0 && rooms[ri]) {
                roomMap[br][bc] = ri;
                rooms[ri].push([br, bc]);
                break;
              }
            }
          }
        }
      }
    }
    
    // Step 5: Final validation
    // Recheck room sizes
    let valid = true;
    for (const room of rooms) {
      if (room.length < minRoom || room.length > maxRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Recheck black connected
    let blackCount = 0, firstBlack = null;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c] === 1) { blackCount++; if (!firstBlack) firstBlack = [r, c]; }
    
    if (blackCount === 0) continue;
    const bVisited = new Set();
    const bQueue = [firstBlack];
    bVisited.add(firstBlack[0] * size + firstBlack[1]);
    while (bQueue.length) {
      const [r, c] = bQueue.shift();
      for (const [nr, nc] of neighbors(r, c, size)) {
        const key = nr * size + nc;
        if (!bVisited.has(key) && grid[nr][nc] === 1) {
          bVisited.add(key);
          bQueue.push([nr, nc]);
        }
      }
    }
    if (bVisited.size !== blackCount) continue;
    
    // No 2x2 black
    if (has2x2Black(grid, size)) continue;
    
    // White rooms are correct (each has exactly one room, sizes match)
    const finalComponents = getAllWhiteComponents(grid, size);
    // Our construction should guarantee this, but verify
    let allGood = true;
    for (const comp of finalComponents) {
      if (comp.length < minRoom || comp.length > maxRoom) { allGood = false; break; }
    }
    if (!allGood) continue;
    
    // Assign numbers
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const comp of finalComponents) {
      const idx = Math.floor(Math.random() * comp.length);
      const [nr, nc] = comp[idx];
      puzzleGrid[nr][nc] = comp.length;
    }
    
    return { size, grid: puzzleGrid, solution: grid.map(r => [...r]) };
  }
  return null;
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
