/**
 * Nurikabe Generator v21 - River DFS approach for hard
 * 
 * Core idea: Build the black "river" explicitly using DFS,
 * which guarantees connectivity by construction.
 * 
 * Algorithm:
 * 1. Start DFS from a random edge cell
 * 2. Grow the DFS path, at each step choosing to go straight, turn, or branch
 * 3. Never create a 2x2 (check before placing)
 * 4. Stop when we've placed enough black cells (~55%)
 * 5. The white regions become rooms - check their sizes
 * 
 * For easy/medium: use v20 room-first (proven fast)
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, targetBlack: 0.44, method: 'room-first', count: 1000, maxFail: 500 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, targetBlack: 0.48, method: 'room-first', count: 1000, maxFail: 500 },
  hard:   { size: 10, maxRoom: 6, minRoom: 1, targetBlack: 0.55, method: 'river', count: 1000, maxFail: 20000 },
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
  for (let dr = -1; dr <= 0; dr++) {
    for (let dc = -1; dc <= 0; dc++) {
      const r0 = r + dr, c0 = c + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      let count = 0;
      if (grid[r0][c0] === 1) count++;
      if (grid[r0][c0+1] === 1) count++;
      if (grid[r0+1][c0] === 1) count++;
      if (count === 3) return true;
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

function generateRiver(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  const blackTarget = Math.floor(total * targetBlack);
  
  for (let attempt = 0; attempt < 2000; attempt++) {
    const grid = Array.from({length: size}, () => Array(size).fill(0));
    
    // Start from a random cell
    const startR = Math.floor(Math.random() * size);
    const startC = Math.floor(Math.random() * size);
    grid[startR][startC] = 1;
    let blackCount = 1;
    
    // Use a stack-based DFS to grow the river
    // Stack contains: list of cells that are "tips" where we can grow from
    const tips = [[startR, startC]];
    
    while (blackCount < blackTarget && tips.length > 0) {
      // Pick a random tip to extend from
      const tipIdx = Math.floor(Math.random() * tips.length);
      const [tipR, tipC] = tips[tipIdx];
      
      // Get available neighbors (white, won't create 2x2)
      const adj = shuffle(neighbors(tipR, tipC, size));
      const candidates = adj.filter(([nr, nc]) => 
        grid[nr][nc] === 0 && !wouldCreate2x2(grid, size, nr, nc)
      );
      
      if (candidates.length === 0) {
        // This tip is stuck, remove it
        tips.splice(tipIdx, 1);
        continue;
      }
      
      // Pick one candidate to extend to
      const [nr, nc] = candidates[0];
      grid[nr][nc] = 1;
      blackCount++;
      
      // The new cell becomes a new tip (the old tip might still be extendable)
      tips.push([nr, nc]);
      
      // With some probability, keep the old tip too (creates branching)
      // This is controlled implicitly - we don't remove it
      
      // Check room sizes every 10 cells
      if (blackCount >= blackTarget * 0.8 && blackCount % 10 === 0) {
        const rooms = getAllWhiteComponents(grid, size);
        const maxActual = Math.max(...rooms.map(r => r.length));
        if (maxActual <= maxRoom && blackCount >= blackTarget * 0.9) break;
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
    
    if (blackCount < blackTarget * 0.85) continue;
    
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
    const blackTargetMax = Math.floor(total * (targetBlack + 0.10));
    
    const roomIndices = rooms.map((_, i) => i);
    roomIndices.sort((a, b) => rooms[a].length - rooms[b].length);
    
    let blackCount = 0;
    for (const ri of roomIndices) {
      if (blackCount >= blackTargetMin && rooms[ri].length > 2) break;
      if (rooms[ri].length > 2 && blackCount >= blackTargetMin * 0.7) break;
      
      let safe = true;
      for (const [r, c] of rooms[ri]) {
        if (wouldCreate2x2(grid, size, r, c)) { safe = false; break; }
      }
      if (!safe) continue;
      
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
        if (wouldCreate2x2(grid, size, r, c)) continue;
        grid[r][c] = 1;
        blackCount++;
      }
    }
    
    if (blackCount < blackTargetMin * 0.85) continue;
    
    if (has2x2Black(grid, size)) {
      for (let fixPass = 0; fixPass < 50; fixPass++) {
        if (!has2x2Black(grid, size)) break;
        for (let r = 0; r < size - 1; r++) {
          for (let c = 0; c < size - 1; c++) {
            if (grid[r][c]===1 && grid[r][c+1]===1 && grid[r+1][c]===1 && grid[r+1][c+1]===1) {
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
      if (has2x2Black(grid, size)) continue;
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
  if (config.method === 'river') return generateRiver(config);
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
      if (failed > config.maxFail) { console.log(`  Too many failures at ${generated}, stopping`); break; }
      continue;
    }
    
    const id = String(i).padStart(4, '0');
    const fp = path.join(DIR, `${diff}-${id}.json`);
    fs.writeFileSync(fp, JSON.stringify(puzzle));
    generated++;
    
    if (generated % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (generated / (generated + failed) * 100).toFixed(1);
      console.log(`  ${generated}/${config.count} (${elapsed}s, ${failed} fails, ${rate}% success)`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Done: ${generated} in ${elapsed}s (failed: ${failed})`);
}

console.log('\n✅ All done!');
