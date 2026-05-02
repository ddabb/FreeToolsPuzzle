/**
 * Nurikabe Generator v19 - Checkerboard-merge approach
 * 
 * For hard (10x10):
 * 1. Start with a checkerboard pattern (guaranteed no 2x2 black)
 * 2. Black cells are naturally ~50% (close to target)
 * 3. Merge adjacent white cells into rooms of target sizes
 * 4. The remaining single white cells become size-1 rooms
 * 
 * For easy/medium: use proven room-first approach
 */

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

const CONFIGS = {
  easy:   { size: 5,  maxRoom: 4, minRoom: 1, targetBlack: 0.44, method: 'room-first', count: 1000 },
  medium: { size: 7,  maxRoom: 5, minRoom: 1, targetBlack: 0.48, method: 'room-first', count: 1000 },
  hard:   { size: 10, maxRoom: 6, minRoom: 1, targetBlack: 0.48, method: 'checkerboard', count: 1000 },
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

/**
 * Checkerboard-merge approach:
 * 1. Start with alternating black/white (checkerboard)
 * 2. Some black cells may be flipped to white (to reduce black %)
 * 3. Merge white cells into rooms of target sizes
 * 4. Ensure black stays connected and 2x2-free
 */
function generateCheckerboard(config) {
  const { size, maxRoom, minRoom, targetBlack } = config;
  const total = size * size;
  
  for (let attempt = 0; attempt < 2000; attempt++) {
    // Step 1: Start with checkerboard
    const grid = Array.from({length: size}, (_, r) => 
      Array.from({length: size}, (_, c) => (r + c) % 2 === 0 ? 1 : 0)
    );
    
    // Checkerboard gives ~50% black. Adjust:
    // For 10x10, checkerboard gives 50 black, 50 white.
    // Target is ~48% black, so we might need to flip a few black→white
    
    // But first: checkerboard black is NOT connected!
    // On a checkerboard, black cells are at (r+c)%2==0, so they only
    // touch diagonally, never orthogonally. Need to add bridges.
    
    // Alternative: use "stripe" pattern instead
    // Row stripes: alternate full black rows and full white rows
    // This guarantees connectivity and no 2x2 within a row
    // But 2x2 can form between rows...
    
    // Better approach: Start with a zigzag "river" pattern
    // that's guaranteed connected, no 2x2, and ~50% black
    
    // Actually, let me try a different seed: a spanning tree of the black cells
    // placed on a checkerboard pattern
    
    // Simplest: start with row 0 all black, then alternate
    // Row 0: all black (10 cells)
    // Row 1: columns 1,3,5,7,9 black (5 cells) 
    // Row 2: columns 0,2,4,6,8 black (5 cells)
    // etc.
    
    // This is basically the checkerboard with row 0 all black
    // Row 0 connects all the odd-row blacks to the even-row blacks
    
    // Fill grid with this pattern but with some randomness
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r === 0) {
          grid[r][c] = 1; // Top row all black for connectivity
        } else {
          grid[r][c] = (r + c) % 2 === 1 ? 1 : 0;
        }
      }
    }
    
    // Now black count = 10 (row 0) + 5*9 (rows 1-9) = 10 + 45 = 55 (55%)
    // Too many. Remove some black cells while keeping connectivity and no 2x2
    
    // Randomly select black cells to flip (except row 0 to keep connectivity base)
    const blackCells = [];
    for (let r = 1; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) blackCells.push([r, c]);
      }
    }
    shuffle(blackCells);
    
    const targetBlack = Math.floor(total * 0.48);
    let currentBlack = 10 + 45; // 55
    
    for (const [r, c] of blackCells) {
      if (currentBlack <= targetBlack) break;
      // Try flipping this black to white
      grid[r][c] = 0;
      currentBlack--;
      
      // Check if still connected and no 2x2
      if (!checkBlackConnected(grid, size) || has2x2Black(grid, size)) {
        grid[r][c] = 1;
        currentBlack++;
      }
    }
    
    // If still too many black, try flipping some row-0 cells
    if (currentBlack > targetBlack + 5) {
      const row0Black = [];
      for (let c = 0; c < size; c++) {
        if (grid[0][c] === 1) row0Black.push([0, c]);
      }
      shuffle(row0Black);
      for (const [r, c] of row0Black) {
        if (currentBlack <= targetBlack) break;
        grid[r][c] = 0;
        currentBlack--;
        if (!checkBlackConnected(grid, size)) {
          grid[r][c] = 1;
          currentBlack++;
        }
      }
    }
    
    // Final validation
    if (has2x2Black(grid, size)) continue;
    if (!checkBlackConnected(grid, size)) continue;
    
    const rooms = getAllWhiteComponents(grid, size);
    let valid = true;
    for (const room of rooms) {
      if (room.length > maxRoom || room.length < minRoom) { valid = false; break; }
    }
    if (!valid) continue;
    
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

// Quick test for hard
console.log('Testing checkerboard-merge for hard...');
let generated = 0, failed = 0;
const startTime = Date.now();

for (let i = 0; i < 100; i++) {
  const puzzle = generateCheckerboard(CONFIGS.hard);
  if (!puzzle) { failed++; continue; }
  generated++;
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Generated ${generated} in ${elapsed}s (${failed} fails)`);
