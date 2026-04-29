/**
 * Slither Link (数回) Solver
 * Uses constraint propagation + backtracking to find unique solutions
 * 
 * Grid: rows x cols cells, each cell has a hint number (0-3 or null)
 * Edges: horizontal edges (rows+1) x cols, vertical edges rows x (cols+1)
 * Each edge: 0 = empty, 1 = line
 * 
 * Constraints:
 * 1. Each cell with hint h: sum of its 4 edges = h
 * 2. Each dot (vertex): sum of connected edges = 0 or 2 (no dead ends, no branching)
 * 3. All line edges form a single connected loop
 */

const SOLVE_UNKNOWN = -1;
const SOLVE_LINE = 1;
const SOLVE_EMPTY = 0;

/**
 * Solve a Slither Link puzzle
 * @param {number[][]} hints - rows x cols, each cell is 0-3 or null (no hint)
 * @returns {object|null} solution with {h: number[][], v: number[][]} or null if no solution
 */
function solve(hints) {
  const rows = hints.length;
  const cols = hints[0].length;
  
  // hEdges[r][c]: horizontal edge between dot(r,c) and dot(r,c+1), r=0..rows, c=0..cols-1
  // vEdges[r][c]: vertical edge between dot(r,c) and dot(r+1,c), r=0..rows-1, c=0..cols
  const hEdges = [];
  for (let r = 0; r <= rows; r++) {
    hEdges[r] = new Array(cols).fill(SOLVE_UNKNOWN);
  }
  const vEdges = [];
  for (let r = 0; r < rows; r++) {
    vEdges[r] = new Array(cols + 1).fill(SOLVE_UNKNOWN);
  }
  
  // Propagate and solve
  const result = propagateAndSolve(hints, hEdges, vEdges, rows, cols);
  return result;
}

/**
 * Count how many edges of each type surround a cell
 */
function countCellEdges(hEdges, vEdges, r, c) {
  let lines = 0, unknowns = 0, empties = 0;
  const edges = [
    hEdges[r][c],         // top
    hEdges[r + 1][c],     // bottom
    vEdges[r][c],         // left
    vEdges[r][c + 1]      // right
  ];
  for (const e of edges) {
    if (e === SOLVE_LINE) lines++;
    else if (e === SOLVE_EMPTY) empties++;
    else unknowns++;
  }
  return { lines, unknowns, empties };
}

/**
 * Count edges around a dot (vertex)
 */
function countDotEdges(hEdges, vEdges, r, c, rows, cols) {
  let lines = 0, unknowns = 0;
  // Top edge of dot (vertical edge above: vEdges[r-1][c], exists when r > 0)
  if (r > 0 && vEdges[r - 1] !== undefined && vEdges[r - 1][c] !== undefined) {
    if (vEdges[r - 1][c] === SOLVE_LINE) lines++;
    else if (vEdges[r - 1][c] === SOLVE_UNKNOWN) unknowns++;
  }
  // Bottom edge
  if (r < rows && vEdges[r] !== undefined && vEdges[r][c] !== undefined) {
    if (vEdges[r][c] === SOLVE_LINE) lines++;
    else if (vEdges[r][c] === SOLVE_UNKNOWN) unknowns++;
  }
  // Left edge (horizontal edge to the left: hEdges[r][c-1], exists when c > 0)
  if (c > 0 && hEdges[r] !== undefined && hEdges[r][c - 1] !== undefined) {
    if (hEdges[r][c - 1] === SOLVE_LINE) lines++;
    else if (hEdges[r][c - 1] === SOLVE_UNKNOWN) unknowns++;
  }
  // Right edge (horizontal edge to the right: hEdges[r][c], exists when c < cols)
  if (c < cols && hEdges[r] !== undefined && hEdges[r][c] !== undefined) {
    if (hEdges[r][c] === SOLVE_LINE) lines++;
    else if (hEdges[r][c] === SOLVE_UNKNOWN) unknowns++;
  }
  return { lines, unknowns };
}

/**
 * Constraint propagation - apply logical deductions
 * Returns: 'solved' | 'contradiction' | 'progress' | 'stuck'
 */
function propagate(hints, hEdges, vEdges, rows, cols) {
  let changed = true;
  while (changed) {
    changed = false;
    
    // Cell constraints
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hint = hints[r][c];
        if (hint === null || hint === undefined) continue;
        
        const { lines, unknowns, empties } = countCellEdges(hEdges, vEdges, r, c);
        
        if (lines > hint) return 'contradiction';
        if (lines + unknowns < hint) return 'contradiction';
        
        // All remaining unknowns must be lines
        if (lines + unknowns === hint && unknowns > 0) {
          // Set unknowns to LINE
          if (hEdges[r][c] === SOLVE_UNKNOWN) { hEdges[r][c] = SOLVE_LINE; changed = true; }
          if (hEdges[r + 1][c] === SOLVE_UNKNOWN) { hEdges[r + 1][c] = SOLVE_LINE; changed = true; }
          if (vEdges[r][c] === SOLVE_UNKNOWN) { vEdges[r][c] = SOLVE_LINE; changed = true; }
          if (vEdges[r][c + 1] === SOLVE_UNKNOWN) { vEdges[r][c + 1] = SOLVE_LINE; changed = true; }
        }
        
        // All remaining unknowns must be empty
        if (lines === hint && unknowns > 0) {
          if (hEdges[r][c] === SOLVE_UNKNOWN) { hEdges[r][c] = SOLVE_EMPTY; changed = true; }
          if (hEdges[r + 1][c] === SOLVE_UNKNOWN) { hEdges[r + 1][c] = SOLVE_EMPTY; changed = true; }
          if (vEdges[r][c] === SOLVE_UNKNOWN) { vEdges[r][c] = SOLVE_EMPTY; changed = true; }
          if (vEdges[r][c + 1] === SOLVE_UNKNOWN) { vEdges[r][c + 1] = SOLVE_EMPTY; changed = true; }
        }
      }
    }
    
    // Dot (vertex) constraints: each dot has exactly 0 or 2 line edges
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const { lines, unknowns } = countDotEdges(hEdges, vEdges, r, c, rows, cols);
        
        if (lines > 2) return 'contradiction';
        
        // If 2 lines already, all unknowns must be empty
        if (lines === 2 && unknowns > 0) {
          // Set all unknown edges around this dot to EMPTY
          if (r > 0 && vEdges[r - 1][c] === SOLVE_UNKNOWN) { vEdges[r - 1][c] = SOLVE_EMPTY; changed = true; }
          if (r < rows && vEdges[r][c] === SOLVE_UNKNOWN) { vEdges[r][c] = SOLVE_EMPTY; changed = true; }
          if (c > 0 && hEdges[r][c - 1] === SOLVE_UNKNOWN) { hEdges[r][c - 1] = SOLVE_EMPTY; changed = true; }
          if (c < cols && hEdges[r][c] === SOLVE_UNKNOWN) { hEdges[r][c] = SOLVE_EMPTY; changed = true; }
        }
        
        // If 1 line + 1 unknown, that unknown must also be a line (degree must be 0 or 2)
        // Actually: if lines=1 and unknowns=1, the unknown MUST be a line (can't have degree 1)
        // Wait, no. degree can be 0 or 2. If lines=1 and unknowns>=1, we need at least one more line
        // If lines=1 and unknowns=0 → contradiction (degree 1)
        if (lines === 1 && unknowns === 0) return 'contradiction';
        
        // If lines=1 and unknowns=1, the unknown must be line
        if (lines === 1 && unknowns === 1) {
          if (r > 0 && vEdges[r - 1][c] === SOLVE_UNKNOWN) { vEdges[r - 1][c] = SOLVE_LINE; changed = true; }
          if (r < rows && vEdges[r][c] === SOLVE_UNKNOWN) { vEdges[r][c] = SOLVE_LINE; changed = true; }
          if (c > 0 && hEdges[r][c - 1] === SOLVE_UNKNOWN) { hEdges[r][c - 1] = SOLVE_LINE; changed = true; }
          if (c < cols && hEdges[r][c] === SOLVE_UNKNOWN) { hEdges[r][c] = SOLVE_LINE; changed = true; }
        }
      }
    }
  }
  
  // Check if fully solved
  let allSolved = true;
  for (let r = 0; r <= rows && allSolved; r++) {
    for (let c = 0; c < cols && allSolved; c++) {
      if (hEdges[r][c] === SOLVE_UNKNOWN) allSolved = false;
    }
  }
  for (let r = 0; r < rows && allSolved; r++) {
    for (let c = 0; c <= cols && allSolved; c++) {
      if (vEdges[r][c] === SOLVE_UNKNOWN) allSolved = false;
    }
  }
  
  if (allSolved) {
    return isSingleLoop(hEdges, vEdges, rows, cols) ? 'solved' : 'contradiction';
  }
  return 'stuck';
}

/**
 * Check if all LINE edges form a single connected loop
 */
function isSingleLoop(hEdges, vEdges, rows, cols) {
  // Count degree of each dot
  const dotDegree = [];
  for (let r = 0; r <= rows; r++) {
    dotDegree[r] = new Array(cols + 1).fill(0);
  }
  
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hEdges[r][c] === SOLVE_LINE) {
        dotDegree[r][c]++;
        dotDegree[r][c + 1]++;
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (vEdges[r][c] === SOLVE_LINE) {
        dotDegree[r][c]++;
        dotDegree[r + 1][c]++;
      }
    }
  }
  
  // Every dot with lines must have degree 2
  let startR = -1, startC = -1;
  let totalDots = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (dotDegree[r][c] > 0) {
        if (dotDegree[r][c] !== 2) return false;
        if (startR === -1) { startR = r; startC = c; }
        totalDots++;
      }
    }
  }
  
  if (startR === -1) return false;
  
  // Trace the loop
  const visited = new Set();
  let r = startR, c = startC;
  let prevR = -1, prevC = -1;
  let steps = 0;
  
  while (steps <= totalDots + 1) {
    const key = r * 100 + c;
    if (visited.has(key)) {
      return r === startR && c === startC && steps === totalDots;
    }
    visited.add(key);
    steps++;
    
    let nextR = -1, nextC = -1;
    
    // Right
    if (c + 1 <= cols && hEdges[r] && hEdges[r][c] === SOLVE_LINE && !(r === prevR && c + 1 === prevC)) {
      nextR = r; nextC = c + 1;
    }
    // Left
    else if (c - 1 >= 0 && hEdges[r] && hEdges[r][c - 1] === SOLVE_LINE && !(r === prevR && c - 1 === prevC)) {
      nextR = r; nextC = c - 1;
    }
    // Down
    else if (r + 1 <= rows && vEdges[r] && vEdges[r][c] === SOLVE_LINE && !(r + 1 === prevR && c === prevC)) {
      nextR = r + 1; nextC = c;
    }
    // Up
    else if (r - 1 >= 0 && vEdges[r - 1] && vEdges[r - 1][c] === SOLVE_LINE && !(r - 1 === prevR && c === prevC)) {
      nextR = r - 1; nextC = c;
    }
    
    if (nextR === -1) return false;
    prevR = r; prevC = c;
    r = nextR; c = nextC;
  }
  return false;
}

/**
 * Deep clone edge arrays
 */
function cloneEdges(hEdges, vEdges, rows, cols) {
  const h = [];
  for (let r = 0; r <= rows; r++) {
    h[r] = hEdges[r].slice();
  }
  const v = [];
  for (let r = 0; r < rows; r++) {
    v[r] = vEdges[r].slice();
  }
  return { h, v };
}

/**
 * Propagation + backtracking solver
 */
function propagateAndSolve(hints, hEdges, vEdges, rows, cols) {
  const status = propagate(hints, hEdges, vEdges, rows, cols);
  
  if (status === 'contradiction') return null;
  if (status === 'solved') {
    return { h: hEdges.map(r => r.slice()), v: vEdges.map(r => r.slice()) };
  }
  
  // Find first unknown edge to branch on
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hEdges[r][c] === SOLVE_UNKNOWN) {
        // Try LINE first
        const clone1 = cloneEdges(hEdges, vEdges, rows, cols);
        clone1.h[r][c] = SOLVE_LINE;
        const result1 = propagateAndSolve(hints, clone1.h, clone1.v, rows, cols);
        
        // Try EMPTY
        const clone2 = cloneEdges(hEdges, vEdges, rows, cols);
        clone2.h[r][c] = SOLVE_EMPTY;
        const result2 = propagateAndSolve(hints, clone2.h, clone2.v, rows, cols);
        
        // For unique solution, we want both branches tried
        // If both have solutions, puzzle is not unique - return first one anyway
        return result1 || result2;
      }
    }
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (vEdges[r][c] === SOLVE_UNKNOWN) {
        const clone1 = cloneEdges(hEdges, vEdges, rows, cols);
        clone1.v[r][c] = SOLVE_LINE;
        const result1 = propagateAndSolve(hints, clone1.h, clone1.v, rows, cols);
        
        const clone2 = cloneEdges(hEdges, vEdges, rows, cols);
        clone2.v[r][c] = SOLVE_EMPTY;
        const result2 = propagateAndSolve(hints, clone2.h, clone2.v, rows, cols);
        
        return result1 || result2;
      }
    }
  }
  
  return null;
}

/**
 * Check if a puzzle has a unique solution
 * Returns: { unique: boolean, solution: object|null, solutionCount: number }
 */
function checkUnique(hints, maxSolutions = 2) {
  const rows = hints.length;
  const cols = hints[0].length;
  
  const hEdges = [];
  for (let r = 0; r <= rows; r++) {
    hEdges[r] = new Array(cols).fill(SOLVE_UNKNOWN);
  }
  const vEdges = [];
  for (let r = 0; r < rows; r++) {
    vEdges[r] = new Array(cols + 1).fill(SOLVE_UNKNOWN);
  }
  
  const solutions = [];
  findAllSolutions(hints, hEdges, vEdges, rows, cols, solutions, maxSolutions);
  
  return {
    unique: solutions.length === 1,
    solutionCount: solutions.length,
    solution: solutions.length > 0 ? solutions[0] : null
  };
}

function findAllSolutions(hints, hEdges, vEdges, rows, cols, solutions, maxSolutions) {
  if (solutions.length >= maxSolutions) return;
  
  const status = propagate(hints, hEdges, vEdges, rows, cols);
  
  if (status === 'contradiction') return;
  if (status === 'solved') {
    solutions.push({ h: hEdges.map(r => r.slice()), v: vEdges.map(r => r.slice()) });
    return;
  }
  
  // Find first unknown
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hEdges[r][c] === SOLVE_UNKNOWN) {
        // Try LINE
        const clone1 = cloneEdges(hEdges, vEdges, rows, cols);
        clone1.h[r][c] = SOLVE_LINE;
        findAllSolutions(hints, clone1.h, clone1.v, rows, cols, solutions, maxSolutions);
        if (solutions.length >= maxSolutions) return;
        
        // Try EMPTY
        const clone2 = cloneEdges(hEdges, vEdges, rows, cols);
        clone2.h[r][c] = SOLVE_EMPTY;
        findAllSolutions(hints, clone2.h, clone2.v, rows, cols, solutions, maxSolutions);
        return;
      }
    }
  }
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (vEdges[r][c] === SOLVE_UNKNOWN) {
        const clone1 = cloneEdges(hEdges, vEdges, rows, cols);
        clone1.v[r][c] = SOLVE_LINE;
        findAllSolutions(hints, clone1.h, clone1.v, rows, cols, solutions, maxSolutions);
        if (solutions.length >= maxSolutions) return;
        
        const clone2 = cloneEdges(hEdges, vEdges, rows, cols);
        clone2.v[r][c] = SOLVE_EMPTY;
        findAllSolutions(hints, clone2.h, clone2.v, rows, cols, solutions, maxSolutions);
        return;
      }
    }
  }
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { solve, checkUnique, isSingleLoop };
}
