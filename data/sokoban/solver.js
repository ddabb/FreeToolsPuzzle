'use strict';

// ============================================================
// Sokoban Solver - Pure JavaScript A* Implementation
// ============================================================
// Supports verifying puzzle solvability
// Format: Our custom JSON format

const fs = require('fs');
const path = require('path');

// ── Priority Queue (min-heap) ────────────────────────────────────────────────
class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) { this.data[0] = last; this._sinkDown(0); }
    return top;
  }
  get size() { return this.data.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent].f <= this.data[i].f) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }
  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

// ── Grid helpers ─────────────────────────────────────────────────────────────
function isWall(grid, r, c) {
  return r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] === 1;
}

// ── Deadlock detection ───────────────────────────────────────────────────────
// 1. Corner deadlock: box in corner with no goal
// 2. Linear wall deadlock: box against a wall with no goal
function isDeadlock(grid, boxes, goals) {
  const goalSet = new Set(goals.map(g => `${g[0]},${g[1]}`));
  const rows = grid.length, cols = grid[0].length;

  for (const [br, bc] of boxes) {
    if (goalSet.has(`${br},${bc}`)) continue; // Box already on goal - OK
    if (goalSet.has(`${br},${bc}`)) continue; // Already on goal - OK
    // Corner check: top-left corner
    if (br === 0 && bc === 0) return true;
    // Corner check: top-right corner
    if (br === 0 && bc === cols - 1) return true;
    // Corner check: bottom-left corner
    if (br === rows - 1 && bc === 0) return true;
    // Corner check: bottom-right corner
    if (br === rows - 1 && bc === cols - 1) return true;
    // Edge deadlock: box on edge against wall, with no goal reachable in that direction
    // If box is on an edge wall
    if (isEdgeBoxAgainstWall(grid, br, bc)) {
      // Only deadlock if no goal in the same wall-aligned direction
      if (!hasGoalInWallDirection(grid, goals, br, bc)) return true;
    }
  }
  return false;
}

// Check if a box is on an edge and the adjacent wall direction
function isEdgeBoxAgainstWall(grid, r, c) {
  const rows = grid.length, cols = grid[0].length;
  // Top wall
  if (r === 0 && isWall(grid, r, c)) return true;
  // Bottom wall
  if (r === rows - 1 && isWall(grid, r, c)) return true;
  // Left wall
  if (c === 0 && isWall(grid, r, c)) return true;
  // Right wall
  if (c === cols - 1 && isWall(grid, r, c)) return true;
  return false;
}

// Check if there's a goal reachable in the wall direction
function hasGoalInWallDirection(grid, goals, r, c) {
  const rows = grid.length, cols = grid[0].length;
  // Check all 4 directions
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    // Move until hitting a wall
    while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !isWall(grid, nr, nc)) {
      if (goals.some(g => g[0] === nr && g[1] === nc)) return true;
      nr += dr; nc += dc;
    }
  }
  return false;
}

// ── BFS distance from any cell to nearest goal (precompute) ──────────────────
// Returns a 2D array of min distance from each cell to nearest goal
function computeGoalDistances(grid, goals) {
  const rows = grid.length, cols = grid[0].length;
  const dist = Array.from({length: rows}, () => Array(cols).fill(Infinity));
  const queue = [];
  for (const [gr, gc] of goals) {
    dist[gr][gc] = 0;
    queue.push([gr, gc]);
  }
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  let head = 0;
  while (head < queue.length) {
    const [r, c] = queue[head++];
    const d = dist[r][c];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !isWall(grid, nr, nc) && dist[nr][nc] === Infinity) {
        dist[nr][nc] = d + 1;
        queue.push([nr, nc]);
      }
    }
  }
  return dist;
}

// ── Manhattan distance from box to nearest goal ───────────────────────────────
function boxGoalHeuristic(boxes, goalDist) {
  // For each box, take the minimum distance to any goal
  // Sum of min distances (not perfect but admissible)
  let total = 0;
  for (const [br, bc] of boxes) {
    const d = goalDist[br][bc];
    if (d === Infinity) return Infinity; // Box unreachable from any goal
    total += d;
  }
  return total;
}

// ── State hashing ─────────────────────────────────────────────────────────────
function stateKey(player, boxes) {
  const boxKey = boxes.map(b => `${b[0]},${b[1]}`).sort().join('|');
  return `${player[0]},${player[1]}|${boxKey}`;
}

// ── Check if all boxes are on goals ─────────────────────────────────────────
function isGoal(boxes, goals) {
  const goalSet = new Set(goals.map(g => `${g[0]},${g[1]}`));
  return boxes.every(b => goalSet.has(`${b[0]},${b[1]}`));
}

// ── Generate all legal moves from current state ──────────────────────────────
function generateMoves(grid, player, boxes) {
  const moves = [];
  const dirs = [[-1,0,'U'],[1,0,'D'],[0,-1,'L'],[0,1,'R']];
  const rows = grid.length, cols = grid[0].length;
  const boxSet = new Set(boxes.map(b => `${b[0]},${b[1]}`));

  for (const [dr, dc] of dirs) {
    const nr = player[0] + dr;
    const nc = player[1] + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (isWall(grid, nr, nc)) continue;

    const isBox = boxSet.has(`${nr},${nc}`);

    if (isBox) {
      // Try to push the box
      const br = nr + dr, bc = nc + dc;
      if (br < 0 || br >= rows || bc < 0 || bc >= cols) continue;
      if (isWall(grid, br, bc)) continue;
      if (boxSet.has(`${br},${bc}`)) continue; // Another box in the way

      // New state: player moves to nr,nc; box moves to br,bc
      const newBoxes = boxes.map(b =>
        b[0] === nr && b[1] === nc ? [br, bc] : [b[0], b[1]]
      );
      moves.push({ player: [nr, nc], boxes: newBoxes, move: dirs.find(d => d[0]===dr && d[1]===dc)[2] });
    } else {
      // Just move player
      moves.push({ player: [nr, nc], boxes: boxes.map(b => [b[0], b[1]]), move: dirs.find(d => d[0]===dr && d[1]===dc)[2] });
    }
  }
  return moves;
}

// ── A* Sokoban Solver ────────────────────────────────────────────────────────
function solve(puzzle, timeLimitMs = 30000) {
  const startTime = Date.now();
  const { grid, playerStart, boxes, goals, rows, cols } = puzzle;

  // Precompute goal distances for heuristic
  const goalDist = computeGoalDistances(grid, goals);

  // Check initial deadlock
  if (isDeadlock(grid, boxes, goals)) {
    return { solvable: false, moves: 0, timeMs: 0, reason: 'initial_deadlock' };
  }

  if (isGoal(boxes, goals)) {
    return { solvable: true, moves: 0, timeMs: 0 };
  }

  const startKey = stateKey(playerStart, boxes);
  const startH = boxGoalHeuristic(boxes, goalDist);
  if (startH === Infinity) {
    return { solvable: false, moves: 0, timeMs: 0, reason: 'unreachable_goal' };
  }

  const open = new MinHeap();
  open.push({ f: startH, g: 0, player: playerStart, boxes: boxes.map(b => [b[0], b[1]]), key: startKey });

  const visited = new Map(); // key -> best g cost
  visited.set(startKey, 0);

  let expansions = 0;
  const maxExpansions = 500000; // Safety limit

  while (open.size > 0) {
    if (Date.now() - startTime > timeLimitMs) {
      return { solvable: null, moves: 0, timeMs: timeLimitMs, reason: 'timeout', expansions };
    }
    if (++expansions > maxExpansions) {
      return { solvable: null, moves: 0, timeMs: Date.now() - startTime, reason: 'max_expansions', expansions };
    }

    const curr = open.pop();

    // Skip if we found a better path to this state
    const currKey = stateKey(curr.player, curr.boxes);
    if (visited.get(currKey) !== curr.g) continue;

    // Check goal
    if (isGoal(curr.boxes, goals)) {
      return { solvable: true, moves: curr.g, timeMs: Date.now() - startTime, expansions };
    }

    // Generate moves
    const moves = generateMoves(grid, curr.player, curr.boxes);
    for (const m of moves) {
      // Check for deadlock in new state (prune early)
      if (isDeadlock(grid, m.boxes, goals)) continue;

      const newKey = stateKey(m.player, m.boxes);
      const newG = curr.g + 1;
      if (visited.has(newKey) && visited.get(newKey) <= newG) continue;

      visited.set(newKey, newG);
      const h = boxGoalHeuristic(m.boxes, goalDist);
      if (h === Infinity) continue; // Can't reach any goal

      open.push({ f: newG + h, g: newG, player: m.player, boxes: m.boxes, key: newKey });
    }
  }

  return { solvable: false, moves: 0, timeMs: Date.now() - startTime, reason: 'no_solution', expansions };
}

// ── Verify all puzzles in a directory ─────────────────────────────────────────
function verifyDir(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.json') && !f.startsWith('index') && !f.startsWith('verify') && !f.startsWith('solve'))
    .sort();
  console.log(`\nVerifying ${files.length} puzzles in ${path.basename(dir)}...`);

  let solvable = 0, unsolvable = 0, timeout = 0, deadlock = 0;
  const results = [];

  for (const file of files) {
    const puzzle = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const { solvable: sol, moves, timeMs, reason, expansions } = solve(puzzle, 10000);

    if (sol === true) {
      solvable++;
      results.push({ file, status: 'OK', moves, timeMs: `${timeMs}ms`, expansions });
      process.stdout.write('.');
    } else if (sol === false) {
      unsolvable++;
      results.push({ file, status: `UNSOLVABLE(${reason})`, moves: 0, timeMs: `${timeMs}ms`, expansions });
      process.stdout.write(reason === 'initial_deadlock' ? 'D' : 'X');
    } else {
      timeout++;
      results.push({ file, status: `TIMEOUT(${reason})`, moves: 0, timeMs: `${timeMs}ms`, expansions });
      process.stdout.write('T');
    }
  }

  console.log(`\n  Solvable: ${solvable} | Unsolvable: ${unsolvable} | Timeout: ${timeout} | Deadlock: ${deadlock}`);

  // Print timeout/unsolvable details
  const problems = results.filter(r => r.status !== 'OK');
  if (problems.length > 0) {
    console.log('\nProblem puzzles:');
    for (const p of problems) {
      console.log(`  ${p.file}: ${p.status} (${p.timeMs}, ${p.expansions} expansions)`);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const sokobanDir = __dirname;

console.log('=== Sokoban Solver - Puzzle Verification ===');
console.log(`Started at: ${new Date().toISOString()}`);

verifyDir(sokobanDir);

console.log('\nDone!');
