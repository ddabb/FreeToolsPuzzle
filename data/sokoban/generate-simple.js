const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname);
const TARGET_PER_DIFFICULTY = 1000;

const DIFFICULTY_THRESHOLD = 10;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getDifficulty(steps) {
  if (steps <= DIFFICULTY_THRESHOLD) return 'easy';
  return 'medium';
}

function xsbToJson(xsb, difficulty, id) {
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

  return { id, difficulty, rows, cols, boxCount: boxes.length, goalCount: goals.length, playerStart: playerStart||[0,0], walls, boxes, goals, grid, xsb };
}

function solveSokoban(level, maxSteps = 3000) {
  const { rows: height, cols: width, walls, boxes, goals, playerStart: player } = level;
  
  const key = (state) => state.player.join(',') + '|' + state.boxes.map(b => b.join(',')).sort().join('|');
  
  const isGoal = (state) => state.boxes.every(box => 
    goals.some(g => g[0] === box[0] && g[1] === box[1])
  );
  
  const getMoves = (state) => {
    const moves = [];
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
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
    let sum = 0;
    for (const box of state.boxes) {
      let minDist = Infinity;
      for (const goal of goals) {
        const dist = Math.abs(box[0] - goal[0]) + Math.abs(box[1] - goal[1]);
        if (dist < minDist) minDist = dist;
      }
      sum += minDist;
    }
    return sum;
  };
  
  const start = { player: [...player], boxes: boxes.map(b => [...b]) };
  const openSet = [{ state: start, g: 0, f: heuristic(start), path: [] }];
  const closed = new Set();
  
  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    if (current.g > maxSteps) continue;
    const stateKey = key(current.state);
    if (closed.has(stateKey)) continue;
    closed.add(stateKey);
    
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

const workingConfigs = [
  { w: 6, h: 6, b: 1, attempts: 200 },
  { w: 7, h: 7, b: 1, attempts: 200 },
  { w: 7, h: 7, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 3, attempts: 200 },
  { w: 9, h: 9, b: 2, attempts: 200 },
  { w: 9, h: 9, b: 3, attempts: 200 },
];

function generatePuzzle(seed) {
  const cfg = workingConfigs[Math.floor(Math.random() * workingConfigs.length)];
  const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed, attempts: cfg.attempts, type: 'class' });
  
  if (!grid || grid._solutionStep < 0) return null;
  
  const steps = grid._solutionStep;
  const difficulty = getDifficulty(steps);
  
  const puzzle = xsbToJson(grid.toReadableString(), difficulty, 0);
  puzzle.solutionSteps = steps;
  
  const solution = solveSokoban(puzzle);
  if (!solution) return null;
  
  puzzle.answer = solution.map(m => {
    const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
    return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
  });
  
  return puzzle;
}

async function main() {
  console.log('Difficulty threshold:');
  console.log('  Easy: <= ' + DIFFICULTY_THRESHOLD + ' steps');
  console.log('  Medium: > ' + DIFFICULTY_THRESHOLD + ' steps');
  
  const seen = new Set();
  const counts = { easy: 0, medium: 0 };
  const stepStats = { easy: [], medium: [] };
  let seed = Date.now();
  let attempts = 0;
  let noSolutionCount = 0;
  
  console.log('\nGenerating puzzles...');
  
  while (counts.easy < TARGET_PER_DIFFICULTY || counts.medium < TARGET_PER_DIFFICULTY) {
    attempts++;
    
    if (attempts % 500 === 0) {
      console.log(`  Attempt ${attempts}: Easy=${counts.easy}, Medium=${counts.medium}, NoSol=${noSolutionCount}`);
    }
    
    const puzzle = generatePuzzle(seed++);
    if (!puzzle) {
      noSolutionCount++;
      continue;
    }
    
    const key = puzzle.xsb;
    if (seen.has(key)) continue;
    seen.add(key);
    
    const diff = puzzle.difficulty;
    
    if ((diff === 'easy' && counts.easy >= TARGET_PER_DIFFICULTY) ||
        (diff === 'medium' && counts.medium >= TARGET_PER_DIFFICULTY)) continue;
    
    counts[diff]++;
    stepStats[diff].push(puzzle.solutionSteps);
    
    puzzle.id = counts[diff];
    const filename = `${diff}-${String(counts[diff]).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(puzzle, null, 2));
    
    if ((counts.easy + counts.medium) % 100 === 0) {
      console.log(`  Progress: Easy=${counts.easy}, Medium=${counts.medium}`);
    }
  }
  
  console.log('\nStatistics:');
  console.log(`Total attempts: ${attempts}`);
  console.log(`No solution: ${noSolutionCount}`);
  console.log(`Success rate: ${((counts.easy + counts.medium) / attempts * 100).toFixed(2)}%`);
  
  for (const diff of ['easy', 'medium']) {
    const steps = stepStats[diff];
    const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
    const min = Math.min(...steps);
    const max = Math.max(...steps);
    console.log(`\n${diff} (${steps.length} puzzles):`);
    console.log(`  Avg steps: ${avg.toFixed(2)}`);
    console.log(`  Min steps: ${min}`);
    console.log(`  Max steps: ${max}`);
  }
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({
    total: counts.easy + counts.medium,
    easy: counts.easy,
    medium: counts.medium,
    hard: 0,
    difficultyThreshold: DIFFICULTY_THRESHOLD,
    generated: new Date().toISOString()
  }, null, 2));
  
  console.log('\nDone!');
  console.log('Output saved to:', OUTPUT_DIR);
}

main().catch(console.error);
