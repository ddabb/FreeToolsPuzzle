/**
 * Akari (Light Up) Solver
 * Uses backtracking to find all solutions
 * 
 * Grid format: rows x cols, ' ' = white, 0-4 = black cell with number
 */

/**
 * Solve an Akari puzzle and return the first solution
 * @param {Array<Array>} grid - rows x cols, ' ' = white, 0-4 = black with number
 * @returns {Object|null} {lights: boolean[][], lit: boolean[][]} or null
 */
function solve(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // State: 0 = empty (can place light), 1 = has light, -1 = black cell
  const state = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r][c] === ' ' ? 0 : -1)
  );
  
  const result = { found: false, lights: null, lit: null };
  solveRecursive(grid, state, rows, cols, 0, result);
  
  if (result.found) {
    return { lights: result.lights, lit: result.lit };
  }
  return null;
}

/**
 * Count solutions (stop at maxCount)
 * @param {Array<Array>} grid
 * @param {number} maxCount - stop when this many solutions found
 * @returns {number}
 */
function countSolutions(grid, maxCount = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  const state = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r][c] === ' ' ? 0 : -1)
  );
  
  const solutions = [];
  findAllSolutions(grid, state, rows, cols, 0, solutions, maxCount);
  return solutions.length;
}

/**
 * Check if puzzle has unique solution
 * @param {Array<Array>} grid
 * @returns {boolean}
 */
function hasUniqueSolution(grid) {
  return countSolutions(grid, 2) === 1;
}

/**
 * Recursive solver - finds first solution
 */
function solveRecursive(grid, state, rows, cols, idx, result) {
  if (result.found) return;
  
  // Find next white cell to decide on
  while (idx < rows * cols && state[Math.floor(idx / cols)][idx % cols] !== 0) {
    idx++;
  }
  
  if (idx >= rows * cols) {
    // All cells decided, check if valid
    if (isSolutionValid(grid, state, rows, cols)) {
      // Save solution
      const lights = Array.from({ length: rows }, () => Array(cols).fill(false));
      const lit = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (state[r][c] === 1) lights[r][c] = true;
        }
      }
      updateLighting(state, lit, rows, cols);
      result.found = true;
      result.lights = lights.map(r => r.slice());
      result.lit = lit.map(r => r.slice());
    }
    return;
  }
  
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  
  // Pruning: check partial constraints
  if (!checkPartialConstraints(grid, state, rows, cols)) {
    return;
  }
  
  // Try placing a light
  if (canPlaceLight(state, rows, cols, r, c)) {
    state[r][c] = 1;
    solveRecursive(grid, state, rows, cols, idx + 1, result);
    if (result.found) return;
    state[r][c] = 0;
  }
  
  // Try not placing a light
  state[r][c] = 0;
  solveRecursive(grid, state, rows, cols, idx + 1, result);
}

/**
 * Find all solutions (stop at maxCount)
 */
function findAllSolutions(grid, state, rows, cols, idx, solutions, maxCount) {
  if (solutions.length >= maxCount) return;
  
  // Find next white cell to decide on
  while (idx < rows * cols && state[Math.floor(idx / cols)][idx % cols] !== 0) {
    idx++;
  }
  
  if (idx >= rows * cols) {
    // All cells decided, check if valid
    if (isSolutionValid(grid, state, rows, cols)) {
      const lights = Array.from({ length: rows }, () => Array(cols).fill(false));
      const lit = Array.from({ length: rows }, () => Array(cols).fill(false));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (state[r][c] === 1) lights[r][c] = true;
        }
      }
      updateLighting(state, lit, rows, cols);
      
      solutions.push({
        lights: lights.map(r => r.slice()),
        lit: lit.map(r => r.slice())
      });
    }
    return;
  }
  
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  
  // Pruning: check partial constraints
  if (!checkPartialConstraints(grid, state, rows, cols)) {
    return;
  }
  
  // Branch 1: Try not placing a light (clone state)
  const state1 = state.map(row => row.slice());
  findAllSolutions(grid, state1, rows, cols, idx + 1, solutions, maxCount);
  if (solutions.length >= maxCount) return;
  
  // Branch 2: Try placing a light
  if (canPlaceLight(state, rows, cols, r, c)) {
    const state2 = state.map(row => row.slice());
    state2[r][c] = 1;
    findAllSolutions(grid, state2, rows, cols, idx + 1, solutions, maxCount);
  }
}

/**
 * Check if we can place a light at (r, c)
 */
function canPlaceLight(state, rows, cols, r, c) {
  // Cell must be empty white cell
  if (state[r][c] === -1) return false; // black cell
  if (state[r][c] === 1) return false; // already has light
  
  // Check horizontal (left)
  for (let c2 = c - 1; c2 >= 0; c2--) {
    if (state[r][c2] === -1) break; // hit black cell
    if (state[r][c2] === 1) return false; // found another light
  }
  // Check horizontal (right)
  for (let c2 = c + 1; c2 < cols; c2++) {
    if (state[r][c2] === -1) break;
    if (state[r][c2] === 1) return false;
  }
  
  // Check vertical (up)
  for (let r2 = r - 1; r2 >= 0; r2--) {
    if (state[r2][c] === -1) break;
    if (state[r2][c] === 1) return false;
  }
  // Check vertical (down)
  for (let r2 = r + 1; r2 < rows; r2++) {
    if (state[r2][c] === -1) break;
    if (state[r2][c] === 1) return false;
  }
  
  return true;
}

/**
 * Update lighting based on current lights in state
 */
function updateLighting(state, lit, rows, cols) {
  // Reset lighting
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      lit[r][c] = false;
    }
  }
  
  // Light up from each light
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state[r][c] === 1) {
        // Light horizontal left
        for (let c2 = c - 1; c2 >= 0; c2--) {
          if (state[r][c2] === -1) break;
          lit[r][c2] = true;
        }
        // Light horizontal right
        for (let c2 = c + 1; c2 < cols; c2++) {
          if (state[r][c2] === -1) break;
          lit[r][c2] = true;
        }
        // Light vertical up
        for (let r2 = r - 1; r2 >= 0; r2--) {
          if (state[r2][c] === -1) break;
          lit[r2][c] = true;
        }
        // Light vertical down
        for (let r2 = r + 1; r2 < rows; r2++) {
          if (state[r2][c] === -1) break;
          lit[r2][c] = true;
        }
        // Light the cell itself
        lit[r][c] = true;
      }
    }
  }
}

/**
 * Check if current partial solution satisfies all constraints
 * This is used for pruning during backtracking
 */
function checkPartialConstraints(grid, state, rows, cols) {
  // Check numbered black cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== ' ' && grid[r][c] !== undefined) {
        const num = parseInt(grid[r][c]);
        if (isNaN(num)) continue;
        
        // Count adjacent lights and unknown white cells
        let adjacentLights = 0;
        let unknownAdjacent = 0;
        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        
        for (const [ar, ac] of adj) {
          if (ar < 0 || ar >= rows || ac < 0 || ac >= cols) continue;
          if (grid[ar][ac] !== ' ') continue; // not white cell
          
          if (state[ar][ac] === 1) {
            adjacentLights++;
          } else if (state[ar][ac] === 0) {
            unknownAdjacent++;
          }
        }
        
        // If we already have more lights than required, invalid
        if (adjacentLights > num) return false;
        
        // If even with all unknowns as lights we can't reach required, invalid
        if (adjacentLights + unknownAdjacent < num) return false;
      }
    }
  }
  
  return true;
}

/**
 * Check if solution is valid (all constraints satisfied)
 */
function isSolutionValid(grid, state, rows, cols) {
  // 1. Check all white cells are lit
  const lit = Array.from({ length: rows }, () => Array(cols).fill(false));
  updateLighting(state, lit, rows, cols);
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === ' ') {
        if (!lit[r][c]) return false;
      }
    }
  }
  
  // 2. Check no two lights see each other (already ensured by canPlaceLight, but double-check)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (state[r][c] === 1) {
        // Check horizontal (left)
        for (let c2 = c - 1; c2 >= 0; c2--) {
          if (state[r][c2] === -1) break;
          if (state[r][c2] === 1) return false;
        }
        // Check horizontal (right)
        for (let c2 = c + 1; c2 < cols; c2++) {
          if (state[r][c2] === -1) break;
          if (state[r][c2] === 1) return false;
        }
        // Check vertical (up)
        for (let r2 = r - 1; r2 >= 0; r2--) {
          if (state[r2][c] === -1) break;
          if (state[r2][c] === 1) return false;
        }
        // Check vertical (down)
        for (let r2 = r + 1; r2 < rows; r2++) {
          if (state[r2][c] === -1) break;
          if (state[r2][c] === 1) return false;
        }
      }
    }
  }
  
  // 3. Check numbered black cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== ' ' && grid[r][c] !== undefined) {
        const num = parseInt(grid[r][c]);
        if (isNaN(num)) continue;
        
        let adjacentLights = 0;
        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for (const [ar, ac] of adj) {
          if (ar < 0 || ar >= rows || ac < 0 || ac >= cols) continue;
          if (grid[ar][ac] !== ' ') continue;
          if (state[ar][ac] === 1) adjacentLights++;
        }
        
        if (adjacentLights !== num) return false;
      }
    }
  }
  
  return true;
}

module.exports = { solve, countSolutions, hasUniqueSolution };
