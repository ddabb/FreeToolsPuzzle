/**
 * Nurikabe Puzzle Generator v11
 * 
 * "Room-first" strategy: Build rooms first, then check if the remaining
 * black cells form a connected 2x2-free region.
 * 
 * Algorithm:
 * 1. Fill the grid with white rooms of target sizes (2-maxRoom)
 * 2. Remaining cells become black
 * 3. Verify: black connected, no 2x2 black
 * 4. If 2x2 black exists, adjust room boundaries
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
  if (count === 0) return true;
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
  
  for (let attempt = 0; attempt < 500; attempt++) {
    // Grid: 0=unassigned, positive=room ID
    const roomId = Array.from({length: size}, () => Array(size).fill(0));
    let nextRoomId = 1;
    const rooms = []; // rooms[i] = array of [r,c] for room with id i+1
    
    // Strategy: flood-fill rooms using BFS from random seeds
    // Each room grows to a random target size between minRoom and maxRoom
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
      
      // BFS to grow room
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
    
    // Convert to grid: 0=white(room), 1=black
    // First, everything starts as white (rooms)
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Convert some rooms to black to reach targetBlack
    // We need to select rooms to turn black such that:
    // 1. Remaining white rooms have size in [minRoom, maxRoom]
    // 2. Black cells are connected
    // 3. No 2x2 black
    
    // Sort rooms by size (small ones first to turn black)
    const roomIndices = rooms.map((_, i) => i);
    // Sort by size ascending - small rooms are candidates for turning black
    roomIndices.sort((a, b) => rooms[a].length - rooms[b].length);
    
    // Calculate current black count (0) and target
    const blackTargetMin = Math.floor(total * targetBlack);
    const blackTargetMax = Math.floor(total * (targetBlack + 0.08));
    
    // Turn small rooms black until we hit target
    let blackCount = 0;
    for (const ri of roomIndices) {
      if (blackCount >= blackTargetMin) break;
      const room = rooms[ri];
      // Only turn black if room is small enough (typically size 1-2)
      if (room.length > 2) continue;
      
      for (const [r, c] of room) {
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    // If still not enough black, need to add more
    // Try adding individual cells from the borders of remaining rooms
    if (blackCount < blackTargetMin) {
      const whiteCells = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (grid[r][c] === 0) whiteCells.push([r, c]);
      
      shuffle(whiteCells);
      for (const [r, c] of whiteCells) {
        if (blackCount >= blackTargetMax) break;
        // Check if removing this cell from its room keeps room >= minRoom
        // Find room this cell belongs to
        const roomIdx = rooms.findIndex(room => room.some(([rr,cc]) => rr===r && cc===c));
        if (roomIdx === -1) continue;
        const remainingSize = rooms[roomIdx].filter(([rr,cc]) => grid[rr][cc] === 0).length;
        if (remainingSize <= minRoom) continue;
        
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    // Now check constraints
    // 1. No 2x2 black
    if (has2x2Black(grid, size)) {
      // Try to fix by flipping one cell in each 2x2 back to white
      let fixed = true;
      for (let r = 0; r < size - 1 && fixed; r++) {
        for (let c = 0; c < size - 1 && fixed; c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            // Try flipping each cell back to white
            const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
            let flipped = false;
            for (const [fr, fc] of candidates) {
              grid[fr][fc] = 0;
              if (!has2x2Black(grid, size)) {
                flipped = true;
                break;
              }
              grid[fr][fc] = 1;
            }
            if (!flipped) { fixed = false; break; }
          }
        }
      }
      if (!fixed) continue;
    }
    
    // 2. Black connected
    if (!checkBlackConnected(grid, size)) {
      // Connect black components by adding bridge cells
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
      
      // Connect components greedily
      components.sort((a, b) => b.length - a.length);
      let allConnected = true;
      
      for (let ci = 1; ci < components.length; ci++) {
        const targetSet = new Set();
        for (const [r,c] of components[0]) targetSet.add(r*size+c);
        
        // BFS from component[ci] through white cells toward targetSet
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
      
      // Recheck 2x2 after adding bridges
      if (has2x2Black(grid, size)) {
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
              const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
              for (const [fr, fc] of candidates) {
                grid[fr][fc] = 0;
                if (!has2x2Black(grid, size) && checkBlackConnected(grid, size)) break;
                grid[fr][fc] = 1;
              }
            }
          }
        }
        if (has2x2Black(grid, size)) continue;
      }
    }
    
    // 3. Check room sizes
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
