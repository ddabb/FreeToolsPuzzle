const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'sokoban');

function xsbToJson(xsb, difficulty, steps) {
  const lines = xsb.trim().split('\n').map(l => l.trimEnd());
  const rows = lines.length;
  const cols = Math.max(...lines.map(l => l.length));
  
  const grid = [], walls = [], boxes = [], goals = [];
  let playerStart = null;

  for (let r = 0; r < rows; r++) {
    const row = [];
    const line = lines[r] || '';
    for (let c = 0; c < cols; c++) {
      const ch = line[c] || ' ';
      if (ch === '#') { row.push(1); walls.push([r,c]); }
      else if (ch === '$') { row.push(0); boxes.push([r,c]); }
      else if (ch === '.') { row.push(0); goals.push([r,c]); }
      else if (ch === '*') { row.push(0); boxes.push([r,c]); goals.push([r,c]); }
      else if (ch === '@') { row.push(0); playerStart = [r,c]; }
      else if (ch === '+') { row.push(0); playerStart = [r,c]; goals.push([r,c]); }
      else { row.push(0); }
    }
    grid.push(row);
  }

  return { id: 0, difficulty, rows, cols, boxCount: boxes.length, goalCount: goals.length, playerStart: playerStart||[0,0], walls, boxes, goals, grid, xsb };
}

function getDifficulty(steps) {
  if (steps <= 10) return 'easy';
  if (steps <= 30) return 'medium';
  return 'hard';
}

// A* solver to generate answer during puzzle creation
function solveSokoban(level, maxSteps = 5000) {
  const { rows: height, cols: width, walls, boxes, goals, playerStart: player } = level;
  
  const key = (state) => state.player.join(',') + '|' + state.boxes.map(b=>b.join(',')).join('|');
  
  const isGoal = (state) => state.boxes.every(box => 
    goals.some(g => g[0] === box[0] && g[1] === box[1])
  );
  
  const getMoves = (state) => {
    const moves = [];
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    const [px, py] = state.player;
    
    for (const [dx, dy] of dirs) {
      const nx = px + dx, ny = py + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (walls.some(w => w[0] === nx && w[1] === ny)) continue;
      
      const boxIdx = state.boxes.findIndex(b => b[0] === nx && b[1] === ny);
      if (boxIdx >= 0) {
        const bx = nx + dx, by = ny + dy;
        if (bx < 0 || bx >= width || by < 0 || by >= height) continue;
        if (walls.some(w => w[0] === bx && w[1] === by)) continue;
        if (state.boxes.some(b => b[0] === bx && b[1] === by)) continue;
        moves.push({ dx, dy, pushBox: boxIdx });
      } else {
        moves.push({ dx, dy, pushBox: -1 });
      }
    }
    return moves;
  };
  
  const heuristic = (state) => {
    let minDist = Infinity;
    for (const box of state.boxes) {
      for (const goal of goals) {
        const dist = Math.abs(box[0] - goal[0]) + Math.abs(box[1] - goal[1]);
        if (dist < minDist) minDist = dist;
      }
    }
    return minDist;
  };
  
  const start = { player: [...player], boxes: boxes.map(b => [...b]) };
  const openSet = [{ state: start, g: 0, f: heuristic(start), path: [] }];
  const closed = new Set();
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    if (current.g > maxSteps) continue;
    if (closed.has(key(current.state))) continue;
    closed.add(key(current.state));
    
    if (isGoal(current.state)) {
      return current.path;
    }
    
    const moves = getMoves(current.state);
    for (const move of moves) {
      const newState = {
        player: [current.state.player[0] + move.dx, current.state.player[1] + move.dy],
        boxes: current.state.boxes.map(b => [...b])
      };
      if (move.pushBox >= 0) {
        newState.boxes[move.pushBox] = [newState.boxes[move.pushBox][0] + move.dx, newState.boxes[move.pushBox][1] + move.dy];
      }
      
      const h = heuristic(newState);
      openSet.push({
        state: newState,
        g: current.g + 1,
        f: current.g + 1 + h,
        path: [...current.path, move]
      });
    }
  }
  
  return null;
}

// Test to find best configs - just use the ones that work even once
const configs = [
  { w: 6, h: 6, b: 1, attempts: 100 },
  { w: 7, h: 7, b: 2, attempts: 100 },
  { w: 8, h: 8, b: 2, attempts: 100 },
  { w: 8, h: 8, b: 3, attempts: 100 },
  { w: 9, h: 9, b: 3, attempts: 100 },
];

console.log('Testing configs...');
for (const cfg of configs) {
  let success = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed, attempts: cfg.attempts, type: 'class' });
    if (grid && grid._solutionStep >= 0) success++;
  }
  console.log(`${cfg.w}x${cfg.h} ${cfg.b}box: ${success}/20 success`);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Use multiple working configs with MORE attempts per puzzle
const workingConfigs = [
  { w: 6, h: 6, b: 1, attempts: 200 },
  { w: 7, h: 7, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 3, attempts: 200 },
];

const TARGET = 1000;
const counts = { easy: 0, medium: 0, hard: 0 };
let seed = 1000;

console.log('\nGenerating puzzles...');
while (counts.easy < TARGET || counts.medium < TARGET || counts.hard < TARGET) {
  const cfg = workingConfigs[Math.floor(Math.random() * workingConfigs.length)];
  const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed: seed++, attempts: cfg.attempts, type: 'class' });
  
  if (!grid || grid._solutionStep < 0) continue;
  
  const steps = grid._solutionStep;
  const difficulty = getDifficulty(steps);
  
  if ((difficulty === 'easy' && counts.easy >= TARGET) ||
      (difficulty === 'medium' && counts.medium >= TARGET) ||
      (difficulty === 'hard' && counts.hard >= TARGET)) continue;
  
  counts[difficulty]++;
  const id = `${difficulty}-${counts[difficulty].toString().padStart(4, '0')}`;
  
  const puzzle = xsbToJson(grid.toReadableString(), difficulty, steps);
  puzzle.id = counts[difficulty];
  
  // Solve and add answer field during generation
  const solution = solveSokoban(puzzle, 2000);
  if (solution) {
    puzzle.answer = solution.map(m => {
      const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
      return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
    });
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.json`), JSON.stringify(puzzle, null, 2));
  
  if ((counts.easy + counts.medium + counts.hard) % 20 === 0) {
    console.log(`Progress: E${counts.easy} M${counts.medium} H${counts.hard}`);
  }
}

fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({
  total: counts.easy + counts.medium + counts.hard,
  easy: counts.easy, medium: counts.medium, hard: counts.hard,
  generated: new Date().toISOString()
}, null, 2));

console.log(`\nDone: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);