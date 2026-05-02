/**
 * Nurikabe Puzzle Generator v18 - Skeleton-first
 * 
 * New strategy for hard (10x10):
 * 1. Build a connected black "skeleton" first (like a tree/river)
 * 2. Ensure no 2x2 during skeleton construction
 * 3. The white regions naturally become rooms
 * 4. Check room sizes and assign numbers
 * 
 * For easy/medium: use proven v11 approach
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, targetBlack: 0.44, method: 'room-first', count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, targetBlack: 0.48, method: 'room-first', count: 1000 },
  hard:   { size: 10, maxRoom: 6, minRoom: 1, targetBlack: 0.48, method: 'skeleton', count: 1000 },
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

function wouldCreate2x2(grid, size, r, c) {
  // Check if making (r,c) black would create a 2x2
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      let count = 0;
      if (grid[r0][c0] === 1) count++;
      if (grid[r0][c0+1] === 1) count++;
      if (grid[r0+1][c0] === 1) count++;
      if (count === 3) return true; // (r,c) would be the 4th
    }
  }
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

/**
 * Skeleton-first approach:
 * 1. Start with all white
 * 2. Grow a connected black "river" that avoids 2x2
 * 3. Stop when we reach targetBlack percentage
 * 4. Check that white rooms have valid sizes
 */
function generateSkeleton(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  const blackTargetMin = Math.floor(total * targetBlack);
  const blackTargetMax = Math.floor(total * (targetBlack + 0.06));
  
  for (let attempt = 0; attempt < 2000; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Start from a random cell
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    let blackCount = 1;
    
    // Maintain a frontier of cells adjacent to black that can be added
    // without creating 2x2
    const inFrontier = new Set();
    const frontier = [];
    
    const addToFrontier = (r, c) => {
      const k = r * size + c;
      if (inFrontier.has(k)) return;
      if (wouldCreate2x2(grid, size, r, c)) return;
      inFrontier.add(k);
      frontier.push([r, c]);
    };
    
    for (const [nr, nc] of neighbors(startR, startC, size)) {
      addToFrontier(nr, nc);
    }
    
    // Grow the skeleton
    while (blackCount < blackTargetMax && frontier.length > 0) {
      // Pick a random frontier cell (with preference for cells that keep the river thin)
      const idx = Math.floor(Math.random() * frontier.length);
      const [r, c] = frontier[idx];
      frontier.splice(idx, 1);
      inFrontier.delete(r * size + c);
      
      if (grid[r][c] === 1) continue;
      if (wouldCreate2x2(grid, size, r, c)) continue;
      
      grid[r][c] = 1;
      blackCount++;
      
      for (const [nr, nc] of neighbors(r, c, size)) {
        if (grid[nr][nc] === 0) addToFrontier(nr, nc);
      }
      
      // Check room sizes periodically - if any room exceeds maxRoom, stop adding black
      if (blackCount % 5 === 0 && blackCount >= blackTargetMin) {
        const rooms = getAllWhiteComponents(grid, size);
        const maxActual = Math.max(...rooms.map(r => r.length));
        if (maxActual <= maxRoom) break; // Good enough!
      }
    }
    
    // Validate
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
    const rooms = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const room of rooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
    // Check black percentage is reasonable
    if (blackCount < blackTargetMin * 0.85) continue;
    
    // Assign numbers
    const puzzleGrid = grid.map(r => r.map(v => 0));
    for (const room of rooms) {
      const idx = Math.floor(Math.random() * room.length);
      const [nr, nc] = room[idx];
      puzzleGrid[nr][nc] = room.length;
    }
    
    return { size, grid: puzzleGrid, solution: grid.map(r => [...r]) };
  }
  return null;
}

/**
 * Room-first approach (v11 proven for easy/medium)
 */
function generateRoomFirst(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 500; attempt++) {
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
    const blackTargetMin = Math.floor(total * targetBlack);
    const blackTargetMax = Math.floor(total * (targetBlack + 0.08));
    
    const roomIndices = rooms.map((_, i) => i);
    roomIndices.sort((a, b) => rooms[a].length - rooms[b].length);
    
    let blackCount = 0;
    for (const ri of roomIndices) {
      if (blackCount >= blackTargetMin && rooms[ri].length > 2) break;
      if (rooms[ri].length > 2 && blackCount >= blackTargetMin * 0.7) break;
      
      for (const [r, c] of rooms[ri]) {
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    if (blackCount < blackTargetMin) {
      const whiteCells = [];
      for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
          if (grid[r][c] === 0) whiteCells.push([r, c]);
      
      shuffle(whiteCells);
      for (const [r, c] of whiteCells) {
        if (blackCount >= blackTargetMax) break;
        const roomIdx = rooms.findIndex(room => room.some(([rr,cc]) => rr===r && cc===c));
        if (roomIdx === -1) continue;
        const remainingSize = rooms[roomIdx].filter(([rr,cc]) => grid[rr][cc] === 0).length;
        if (remainingSize <= minRoom) continue;
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    if (has2x2Black(grid, size)) {
      let fixed = true;
      for (let r = 0; r < size - 1 && fixed; r++) {
        for (let c = 0; c < size - 1 && fixed; c++) {
          if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
            const candidates = shuffle([[r,c],[r,c+1],[r+1,c],[r+1,c+1]]);
            let flipped = false;
            for (const [fr, fc] of candidates) {
              grid[fr][fc] = 0;
              if (!has2x2Black(grid, size)) { flipped = true; break; }
              grid[fr][fc] = 1;
            }
            if (!flipped) { fixed = false; break; }
          }
        }
      }
      if (!fixed) continue;
    }
    
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
    
    const finalRooms = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const room of finalRooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
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

function generatePuzzle(config) {
  if (config.method === 'skeleton') return generateSkeleton(config);
  return generateRoomFirst(config);
}

// Main
for (const [diff, config] of Object.entries(CONFIGS)) {
  console.log(`\n=== Generating ${diff} (${config.size}×${config.size}, ${config.method}, ${config.count} puzzles) ===`);
  let generated = 0, failed = 0;
  const startTime = Date.now();
  
  for (let i = 1; i <= config.count; i++) {
    const puzzle = generatePuzzle(config);
    if (!puzzle) {
      failed++;
      i--;
      if (failed > 5000) { console.log(`  Too many failures at ${generated}, stopping`); break; }
      continue;
    }
    
    const id = String(i).padStart(4, '0');
    const fp = path.join(DIR, `${diff}-${id}.json`);
    fs.writeFileSync(fp, JSON.stringify(puzzle));
    generated++;
    
    if (generated % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${generated}/${config.count} (${elapsed}s, ${failed} fails)`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Done: ${generated} in ${elapsed}s (failed: ${failed})`);
}

console.log('\n✅ All done!');
