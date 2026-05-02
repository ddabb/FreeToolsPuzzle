/**
 * Nurikabe Puzzle Generator v13
 * 
 * "Corner-safe room growth" - grow rooms while ensuring no 4 rooms
 * meet at a corner (which would create 2x2 black).
 * 
 * Key rule: When growing a room, never allow a configuration where
 * cells (r,c), (r,c+1), (r+1,c), (r+1,c+1) belong to 4 different rooms.
 * 
 * After room placement, all unassigned cells become black.
 * Since no 4 rooms meet at corners, there are no 2x2 black blocks.
 * Black cells between rooms are naturally connected through shared borders.
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, count: 1000 },
  hard:   { size: 10, maxRoom: 8, minRoom: 1, count: 1000 },
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

/**
 * Check if assigning cell (r,c) to room rid would create a 4-room corner.
 * A 4-room corner happens when 4 cells in a 2x2 block all have different room IDs.
 */
function wouldCreate4RoomCorner(roomId, size, r, c, rid) {
  // Temporarily assign
  const oldVal = roomId[r][c];
  roomId[r][c] = rid;
  
  let bad = false;
  // Check all 2x2 blocks containing (r,c)
  for (let dr = -1; dr <= 0 && !bad; dr++) {
    for (let dc = -1; dc <= 0 && !bad; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      
      const ids = [
        roomId[r0][c0], roomId[r0][c0+1],
        roomId[r0+1][c0], roomId[r0+1][c0+1]
      ];
      
      // All 4 cells are assigned (non-zero) and all different
      if (ids.every(id => id !== 0)) {
        const unique = new Set(ids);
        if (unique.size === 4) bad = true;
      }
    }
  }
  
  roomId[r][c] = oldVal;
  return bad;
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
  
  for (let attempt = 0; attempt < 1000; attempt++) {
    // Step 1: Grow rooms with 4-room-corner prevention
    const roomId = Array.from({length: size}, () => Array(size).fill(0));
    let nextRoomId = 1;
    const rooms = []; // rooms[i] = {id, cells: [{r,c}]}
    
    const allCells = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        allCells.push([r, c]);
    shuffle(allCells);
    
    for (const [sr, sc] of allCells) {
      if (roomId[sr][sc] !== 0) continue;
      
      const targetSize = minRoom + Math.floor(Math.random() * (maxRoom - minRoom + 1));
      const rid = nextRoomId++;
      roomId[sr][sc] = rid;
      const roomCells = [[sr, sc]];
      
      // BFS growth with corner check
      const queue = [[sr, sc]];
      while (queue.length && roomCells.length < targetSize) {
        const idx = Math.floor(Math.random() * queue.length);
        const [r, c] = queue[idx];
        queue.splice(idx, 1);
        
        const adj = shuffle(neighbors(r, c, size));
        for (const [nr, nc] of adj) {
          if (roomId[nr][nc] !== 0) continue;
          if (roomCells.length >= targetSize) break;
          
          // Check if adding this cell to this room would create 4-room corner
          if (wouldCreate4RoomCorner(roomId, size, nr, nc, rid)) continue;
          
          roomId[nr][nc] = rid;
          roomCells.push([nr, nc]);
          queue.push([nr, nc]);
        }
      }
      
      rooms.push({id: rid, cells: roomCells});
    }
    
    // Step 2: Decide which cells are black
    // Any cell not assigned to a room stays as potential black
    // But actually, all cells ARE assigned to rooms in this approach
    // We need to SELECT some rooms to turn black
    
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Strategy: Turn small rooms (size 1-2) into black cells
    // This naturally creates black "walls" between remaining white rooms
    const sortedRooms = [...rooms].sort((a, b) => a.cells.length - b.cells.length);
    
    // Target: ~45-55% black
    const blackTargetMin = Math.floor(total * 0.42);
    const blackTargetMax = Math.floor(total * 0.58);
    let blackCount = 0;
    
    for (const room of sortedRooms) {
      if (blackCount >= blackTargetMin && room.cells.length > 2) break;
      if (room.cells.length > 2 && blackCount >= blackTargetMin * 0.8) break;
      
      for (const [r, c] of room.cells) {
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    // Step 3: Check constraints
    // Since we prevented 4-room corners, 2x2 black should be rare
    // But it CAN still happen if two adjacent rooms are both turned black
    // Fix any 2x2 by reverting one cell
    
    for (let fixPass = 0; fixPass < 50; fixPass++) {
      if (!has2x2Black(grid, size)) break;
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            // Revert a random cell in this 2x2
            const cells = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
            for (const [fr, fc] of cells) {
              grid[fr][fc] = 0;
              if (!has2x2Black(grid, size)) break;
              grid[fr][fc] = 1;
            }
          }
        }
      }
    }
    
    // Connect black components
    if (!checkBlackConnected(grid, size)) {
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
              for (const [pr, pc] of newPath) grid[pr][pc] = 1;
              found = true;
              break;
            }
            if (grid[nr][nc] === 0) {
              bfsQueue.push({r: nr, c: nc, path: newPath});
            }
          }
        }
        if (!found) { allConnected = false; break; }
      }
      
      if (!allConnected) continue;
      
      // Fix 2x2 again after bridges
      for (let fixPass = 0; fixPass < 50; fixPass++) {
        if (!has2x2Black(grid, size)) break;
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
              const cells = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
              for (const [fr, fc] of cells) {
                grid[fr][fc] = 0;
                if (!has2x2Black(grid, size) && checkBlackConnected(grid, size)) break;
                grid[fr][fc] = 1;
              }
            }
          }
        }
      }
      if (has2x2Black(grid, size)) continue;
    }
    
    // Final validation
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
    const finalRooms = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const room of finalRooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Assign numbers
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const room of finalRooms) {
      const idx = Math.floor(Math.random() * room.length);
      const [nr, nc] = room[idx];
      puzzleGrid[nr][nc] = room.length;
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
      if (failed > 2000) { console.log(`  Too many failures at ${generated}, stopping`); break; }
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
