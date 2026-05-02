/**
 * Nurikabe Puzzle Generator v16 - "Wall-aware room growth"
 * 
 * Root cause of hard failure: rooms grow independently, and when small rooms
 * are turned black, adjacent rooms MERGE into huge white regions (60+ cells).
 * 
 * Fix: During room growth, ensure that between any two rooms there is at
 * least one black cell (wall). This means rooms grow with mandatory gaps.
 * 
 * Algorithm:
 * 1. Place rooms one at a time, growing from a seed
 * 2. Each room is surrounded by a 1-cell "wall" (reserved for black)
 * 3. New rooms can only start in cells not adjacent to existing rooms
 * 4. After all rooms placed, fill walls and gaps with black
 * 5. Verify connectivity and fix 2x2
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

function generatePuzzle(config) {
  const { size, maxRoom, minRoom } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
    // Grid: 0=unassigned, 1=wall(black), >1=room ID
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    let nextRoomId = 2; // room IDs start from 2 (1 is reserved for black)
    const rooms = []; // array of [{r,c}]
    
    // Step 1: Place rooms with walls between them
    // Try to place rooms until grid is mostly filled
    
    const allCells = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        allCells.push([r, c]);
    shuffle(allCells);
    
    for (const [sr, sc] of allCells) {
      if (grid[sr][sc] !== 0) continue; // already assigned
      
      // Can we start a room here? (not adjacent to existing room)
      const adjToRoom = neighbors(sr, sc, size).some(([nr, nc]) => grid[nr][nc] >= 2);
      if (adjToRoom) {
        // This cell is between rooms - make it a wall
        grid[sr][sc] = 1;
        continue;
      }
      
      // Start a new room
      const rid = nextRoomId++;
      const targetSize = minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1));
      grid[sr][sc] = rid;
      const roomCells = [[sr, sc]];
      
      // BFS to grow room, but stop at walls and other rooms
      const queue = [[sr, sc]];
      while (queue.length && roomCells.length < targetSize) {
        const idx = Math.floor(Math.random() * queue.length);
        const [r, c] = queue[idx];
        queue.splice(idx, 1);
        
        const adj = shuffle(neighbors(r, c, size));
        for (const [nr, nc] of adj) {
          if (grid[nr][nc] !== 0) continue; // wall or room
          if (roomCells.length >= targetSize) break;
          
          // Check if this cell is adjacent to another room (not ours)
          const adjOtherRoom = neighbors(nr, nc, size).some(([nnr, nnc]) => 
            grid[nnr][nnc] >= 2 && grid[nnr][nnc] !== rid
          );
          
          if (adjOtherRoom) {
            // Place a wall here instead
            grid[nr][nc] = 1;
            continue;
          }
          
          grid[nr][nc] = rid;
          roomCells.push([nr, nc]);
          queue.push([nr, nc]);
        }
      }
      
      rooms.push(roomCells);
    }
    
    // Step 2: Fill remaining unassigned cells as black
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0) grid[r][c] = 1;
      }
    }
    
    // Step 3: Verify - convert to 0/1 grid for checks
    const finalGrid = grid.map(r => r.map(v => v >= 2 ? 0 : 1));
    
    // Since rooms are separated by walls, white regions = individual rooms
    // No merging! Each room is its own white component.
    
    // Check room sizes
    let valid = true;
    for (const room of rooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Check 2x2 black
    // Walls between rooms might create 2x2 where two wall cells meet
    if (has2x2Black(finalGrid, size)) {
      // Try to fix by flipping one cell in each 2x2 to white (add to a room)
      for (let fixPass = 0; fixPass < 100; fixPass++) {
        if (!has2x2Black(finalGrid, size)) break;
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (finalGrid[r][c]===1 && finalGrid[r][c+1]===1 && finalGrid[r+1][c]===1 && finalGrid[r+1][c+1]===1) {
              // Find a cell adjacent to a room and assign it to that room
              const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
              let fixed = false;
              for (const [fr, fc] of candidates) {
                // Find adjacent room
                const adjRoom = neighbors(fr, fc, size).find(([nr, nc]) => finalGrid[nr][nc] === 0);
                if (adjRoom) {
                  const [ar, ac] = adjRoom;
                  // Find which room this belongs to
                  const roomIdx = rooms.findIndex(room => room.some(([rr,cc]) => rr===ar && cc===ac));
                  if (roomIdx !== -1 && rooms[roomIdx].length < maxRoom) {
                    finalGrid[fr][fc] = 0;
                    rooms[roomIdx].push([fr, fc]);
                    // Check we didn't create a new 2x2... actually just break and recheck
                    if (!has2x2Black(finalGrid, size)) { fixed = true; break; }
                    // If we made it worse, revert
                    finalGrid[fr][fc] = 1;
                    rooms[roomIdx].pop();
                  }
                }
              }
              if (fixed) break;
            }
          }
        }
      }
    }
    
    // Re-check room sizes after fixes
    if (has2x2Black(finalGrid, size)) continue;
    
    // Recompute rooms from finalGrid (since we may have added cells)
    const finalRooms = getAllWhiteComponents(finalGrid, size);
    valid = true;
    for (const room of finalRooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Check black connected
    if (!checkBlackConnected(finalGrid, size)) {
      // Connect components
      const visited = Array.from({length: size}, () => Array(size).fill(false));
      const components = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (visited[r][c] || finalGrid[r][c] !== 1) continue;
          const cells = [];
          const queue = [[r, c]];
          visited[r][c] = true;
          while (queue.length) {
            const [cr, cc] = queue.shift();
            cells.push([cr, cc]);
            for (const [nr, nc] of neighbors(cr, cc, size)) {
              if (!visited[nr][nc] && finalGrid[nr][nc] === 1) {
                visited[nr][nc] = true;
                queue.push([nr, nc]);
              }
            }
          }
          components.push(cells);
        }
      }
      
      components.sort((a, b) => b.length - a.length);
      let allConnected = true;
      
      for (let ci = 1; ci < components.length; ci++) {
        const targetSet = new Set();
        for (const [r,c] of components[0]) targetSet.add(r*size+c);
        
        const sourceSet = new Set(components[ci].map(([r,c]) => r*size+c));
        const bfsVisited = new Set(sourceSet);
        const bfsQueue = components[ci].map(([r,c]) => ({r, c, path: []}));
        
        let found = false;
        while (bfsQueue.length && !found) {
          const {r, c, path} = bfsQueue.shift();
          for (const [nr, nc] of neighbors(r, c, size)) {
            const key = nr * size + nc;
            if (bfsVisited.has(key)) continue;
            bfsVisited.add(key);
            
            const newPath = [...path, [nr, nc]];
            if (targetSet.has(key)) {
              for (const [pr, pc] of newPath) finalGrid[pr][pc] = 1;
              found = true;
              break;
            }
            if (finalGrid[nr][nc] === 0) {
              bfsQueue.push({r: nr, c: nc, path: newPath});
            }
          }
        }
        if (!found) { allConnected = false; break; }
      }
      
      if (!allConnected) continue;
      
      // Fix 2x2 after bridges
      for (let fixPass = 0; fixPass < 50; fixPass++) {
        if (!has2x2Black(finalGrid, size)) break;
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (finalGrid[r][c]===1 && finalGrid[r][c+1]===1 && finalGrid[r+1][c]===1 && finalGrid[r+1][c+1]===1) {
              const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
              for (const [fr, fc] of candidates) {
                finalGrid[fr][fc] = 0;
                if (!has2x2Black(finalGrid, size) && checkBlackConnected(finalGrid, size)) break;
                finalGrid[fr][fc] = 1;
              }
            }
          }
        }
      }
      if (has2x2Black(finalGrid, size)) continue;
    }
    
    // Final validation
    const validatedRooms = getAllWhiteComponents(finalGrid, size);
    valid = true;
    for (const room of validatedRooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    if (has2x2Black(finalGrid, size)) continue;
    if (!checkBlackConnected(finalGrid, size)) continue;
    
    // Assign numbers
    const puzzleGrid = finalGrid.map(r => r.map(v => 0));
    for (const room of validatedRooms) {
      const idx = Math.floor(Math.random() * room.length);
      const [nr, nc] = room[idx];
      puzzleGrid[nr][nc] = room.length;
    }
    
    return { size, grid: puzzleGrid, solution: finalGrid.map(r => [...r]) };
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
