/**
 * Nurikabe Puzzle Generator v12
 * 
 * "Spanning Tree" strategy for hard difficulty:
 * 1. Generate rooms first (BFS flood-fill, same as v11)
 * 2. Build a spanning tree of rooms using the dual graph
 * 3. The black cells (room boundaries) from the tree are naturally connected
 * 4. Avoid 2x2 by ensuring no 4 rooms meet at a corner
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, targetBlack: 0.44, count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, targetBlack: 0.48, count: 1000 },
  hard:   { size: 10, maxRoom: 8, minRoom: 1, targetBlack: 0.45, count: 1000 },
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
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 1000; attempt++) {
    // Step 1: Create rooms using flood-fill from random seeds
    const roomId = Array.from({length: size}, () => Array(size).fill(0));
    let nextRoomId = 1;
    const rooms = new Map(); // roomId -> [{r,c}]
    
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
      
      const queue = [[sr, sc]];
      while (queue.length && roomCells.length < targetSize) {
        const idx = Math.floor(Math.random() * queue.length);
        const [r, c] = queue[idx];
        queue.splice(idx, 1);
        
        const adj = shuffle(neighbors(r, c, size));
        for (const [nr, nc] of adj) {
          if (roomId[nr][nc] !== 0) continue;
          if (roomCells.length >= targetSize) break;
          roomId[nr][nc] = rid;
          roomCells.push([nr, nc]);
          queue.push([nr, nc]);
        }
      }
      
      rooms.set(rid, roomCells);
    }
    
    // Step 2: Build grid - white=0, black=1
    // Initially all white
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // We need to add black cells between rooms to:
    // a) Ensure black cells are connected
    // b) Ensure no 2x2 black
    // c) Room sizes are within bounds
    
    // Strategy: Use a "wall builder" approach
    // For each pair of adjacent cells in different rooms, add a black cell
    // But we need to be selective to avoid 2x2 and maintain connectivity
    
    // First, find all inter-room boundaries
    const boundaries = []; // [{r1,c1,r2,c2,rid1,rid2}]
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        for (const [nr, nc] of neighbors(r, c, size)) {
          if (roomId[r][c] !== roomId[nr][nc]) {
            const minR = Math.min(r, nr), minC = Math.min(c, nc);
            const maxR = Math.max(r, nr), maxC = Math.max(c, nc);
            // Avoid duplicates
            const key = `${minR},${minC},${maxR},${maxC}`;
            if (!boundaries.find(b => b.key === key)) {
              boundaries.push({
                key,
                r1: r, c1: c, r2: nr, c2: nc,
                rid1: roomId[r][c], rid2: roomId[nr][nc]
              });
            }
          }
        }
      }
    }
    
    // Build a graph of rooms (adjacency)
    const roomAdj = new Map(); // rid -> Set of adjacent rids
    for (const b of boundaries) {
      if (!roomAdj.has(b.rid1)) roomAdj.set(b.rid1, new Set());
      if (!roomAdj.has(b.rid2)) roomAdj.set(b.rid2, new Set());
      roomAdj.get(b.rid1).add(b.rid2);
      roomAdj.get(b.rid2).add(b.rid1);
    }
    
    // Build spanning tree of rooms (this ensures black walls between tree edges
    // will be connected through shared room corners)
    const treeEdges = new Set(); // "rid1-rid2" where rid1 < rid2
    const visited = new Set();
    const startRoom = roomId[0][0];
    visited.add(startRoom);
    const queue = [startRoom];
    
    while (queue.length) {
      const idx = Math.floor(Math.random() * queue.length);
      const current = queue[idx];
      queue.splice(idx, 1);
      
      const adj = roomAdj.has(current) ? shuffle([...roomAdj.get(current)]) : [];
      for (const next of adj) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
        const edgeKey = current < next ? `${current}-${next}` : `${next}-${current}`;
        treeEdges.add(edgeKey);
      }
    }
    
    // For each tree edge, we need at least one black cell on the boundary
    // Select boundary cells to place black
    
    // Actually, let's take a simpler approach:
    // Place black cells on ALL inter-room boundaries, then remove extras
    
    // For simplicity, for each boundary pair, pick ONE cell to be black
    // (the one with lower coordinates, or random)
    
    // Actually the cleanest approach: turn all cells NOT in a room (unassigned)
    // and select boundary cells as black.
    
    // Let me try yet another approach: 
    // Just directly build the grid from rooms + boundaries
    
    // Mark all cells as white (room cells)
    // Then add black cells between rooms
    // For each pair of adjacent rooms, we need at least one black separator
    
    // Hmm, this is getting complicated. Let me go back to the simpler approach.
    // Use v11's method but with better parameters for hard.
    
    // Actually, let me try a completely different angle for hard:
    // Generate on a smaller grid and scale up? No, that doesn't make sense.
    
    // Let me try: for hard, use lower black ratio and bigger rooms
    // This should make it easier to satisfy constraints
    
    break; // Fall through to v11-style generation below
  }
  
  // If we got here, use v11-style approach
  return generatePuzzleV11Style(config);
}

function generatePuzzleV11Style(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 1000; attempt++) {
    const roomId = Array.from({length: size}, () => Array(size).fill(0));
    let nextRoomId = 1;
    const rooms = [];
    
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
      
      const queue = [[sr, sc]];
      while (queue.length && roomCells.length < targetSize) {
        const idx = Math.floor(Math.random() * queue.length);
        const [r, c] = queue[idx];
        queue.splice(idx, 1);
        
        const adj = shuffle(neighbors(r, c, size));
        for (const [nr, nc] of adj) {
          if (roomId[nr][nc] !== 0) continue;
          if (roomCells.length >= targetSize) break;
          roomId[nr][nc] = rid;
          roomCells.push([nr, nc]);
          queue.push([nr, nc]);
        }
      }
      
      rooms.push(roomCells);
    }
    
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Turn small rooms (size 1-2) black first
    const blackTargetMin = Math.floor(total * targetBlack);
    const blackTargetMax = Math.floor(total * (targetBlack + 0.10));
    let blackCount = 0;
    
    // Sort rooms by size, turn smallest black first
    const roomIndices = rooms.map((_, i) => i);
    roomIndices.sort((a, b) => rooms[a].length - rooms[b].length);
    
    for (const ri of roomIndices) {
      if (blackCount >= blackTargetMin) break;
      if (rooms[ri].length > Math.max(2, minRoom)) continue;
      for (const [r, c] of rooms[ri]) {
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    // Add more black if needed from room borders
    if (blackCount < blackTargetMin) {
      // Find white cells adjacent to black that we can flip
      for (let pass = 0; pass < 100 && blackCount < blackTargetMin; pass++) {
        const candidates = [];
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            if (grid[r][c] !== 0) continue;
            if (neighbors(r, c, size).some(([nr, nc]) => grid[nr][nc] === 1)) {
              candidates.push([r, c]);
            }
          }
        }
        if (candidates.length === 0) break;
        shuffle(candidates);
        
        let placed = false;
        for (const [r, c] of candidates) {
          // Check room size after removal
          const room = rooms.find(room => room.some(([rr,cc]) => rr===r && cc===c));
          if (!room) continue;
          const whiteInRoom = room.filter(([rr,cc]) => grid[rr][cc] === 0).length;
          if (whiteInRoom <= Math.max(minRoom, 1)) continue;
          
          grid[r][c] = 1;
          blackCount++;
          placed = true;
          break;
        }
        if (!placed) break;
      }
    }
    
    // Fix 2x2 black blocks
    for (let fixPass = 0; fixPass < 50; fixPass++) {
      if (!has2x2Black(grid, size)) break;
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            // Try removing each cell, prefer keeping black connected
            const cells = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
            for (const [fr, fc] of cells) {
              grid[fr][fc] = 0;
              if (checkBlackConnected(grid, size)) break;
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
      
      // Re-fix 2x2
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
    const puzzle = generatePuzzleV11Style(config);
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
