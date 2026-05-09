const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'sokoban');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'freetools', 'packages', 'math', 'pages', 'sokoban', 'data');
const TARGET_PER_DIFFICULTY = 1000;

const DIFFICULTY_THRESHOLDS = {
  easy: 15,
  medium: 35
};

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getDifficulty(steps) {
  if (steps <= DIFFICULTY_THRESHOLDS.easy) return 'easy';
  if (steps <= DIFFICULTY_THRESHOLDS.medium) return 'medium';
  return 'hard';
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

function solveSokoban(level, maxSteps = 5000) {
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
      const newF = current.g + 1 + h;
      
      let found = false;
      for (let i = 0; i < openSet.length; i++) {
        if (openSet[i].f > newF) {
          openSet.splice(i, 0, { state: newState, g: current.g + 1, f: newF, path: [...current.path, move] });
          found = true;
          break;
        }
      }
      if (!found) {
        openSet.push({ state: newState, g: current.g + 1, f: newF, path: [...current.path, move] });
      }
    }
  }
  
  return null;
}

function generatePuzzle(difficulty, seed) {
  const configs = [
    { w: 6, h: 6, b: 1, attempts: 100 },
    { w: 7, h: 7, b: 1, attempts: 100 },
    { w: 7, h: 7, b: 2, attempts: 100 },
    { w: 8, h: 8, b: 2, attempts: 100 },
    { w: 8, h: 8, b: 3, attempts: 100 },
    { w: 9, h: 9, b: 2, attempts: 100 },
    { w: 9, h: 9, b: 3, attempts: 100 },
  ];
  
  const cfg = configs[Math.floor(Math.random() * configs.length)];
  const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed, attempts: cfg.attempts, type: 'class' });
  
  if (!grid || grid._solutionStep < 0) return null;
  
  const steps = grid._solutionStep;
  const puzzleDifficulty = getDifficulty(steps);
  
  if (puzzleDifficulty !== difficulty) return null;
  
  const puzzle = xsbToJson(grid.toReadableString(), difficulty, 0);
  
  const solution = solveSokoban(puzzle);
  if (!solution) return null;
  
  puzzle.answer = solution.map(m => {
    const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
    return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
  });
  
  return puzzle;
}

async function main() {
  console.log('Loading puzzles from:', RAW_DIR);
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  console.log('Found', files.length, 'files');
  
  const puzzlesByDifficulty = { easy: [], medium: [], hard: [] };
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
      if (data.difficulty && puzzlesByDifficulty[data.difficulty]) {
        puzzlesByDifficulty[data.difficulty].push(data);
      }
    } catch (e) {
      console.error(`Error loading ${file}:`, e.message);
    }
  }
  
  console.log('\nDifficulty thresholds:');
  console.log('  Easy: <= ' + DIFFICULTY_THRESHOLDS.easy + ' steps');
  console.log('  Medium: <= ' + DIFFICULTY_THRESHOLDS.medium + ' steps');
  console.log('  Hard: > ' + DIFFICULTY_THRESHOLDS.medium + ' steps');
  
  console.log('\nLoaded puzzles:');
  console.log('  Easy:', puzzlesByDifficulty.easy.length);
  console.log('  Medium:', puzzlesByDifficulty.medium.length);
  console.log('  Hard:', puzzlesByDifficulty.hard.length);
  
  const seen = new Set();
  const finalPuzzles = { easy: [], medium: [], hard: [] };
  
  for (const difficulty of ['easy', 'medium', 'hard']) {
    console.log(`\nProcessing ${difficulty} puzzles...`);
    const puzzles = puzzlesByDifficulty[difficulty];
    let validCount = 0;
    
    for (let i = 0; i < puzzles.length && validCount < TARGET_PER_DIFFICULTY; i++) {
      const puzzle = puzzles[i];
      
      const key = puzzle.xsb || JSON.stringify(puzzle.grid);
      if (seen.has(key)) continue;
      seen.add(key);
      
      if ((i + 1) % 500 === 0) {
        console.log(`  Processed ${i + 1}/${puzzles.length}, valid: ${validCount}, need: ${TARGET_PER_DIFFICULTY - validCount}`);
      }
      
      if (!puzzle.answer || puzzle.answer.length === 0) {
        const solution = solveSokoban(puzzle, 3000);
        if (!solution) continue;
        
        puzzle.answer = solution.map(m => {
          const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
          return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
        });
      }
      
      puzzle.id = validCount + 1;
      finalPuzzles[difficulty].push(puzzle);
      validCount++;
    }
    
    console.log(`  From existing: ${validCount}/${TARGET_PER_DIFFICULTY} valid`);
    
    if (validCount < TARGET_PER_DIFFICULTY) {
      console.log(`  Generating ${TARGET_PER_DIFFICULTY - validCount} additional puzzles...`);
      let seed = Date.now();
      let attempts = 0;
      let genCount = 0;
      
      while (validCount < TARGET_PER_DIFFICULTY) {
        attempts++;
        if (attempts % 500 === 0) {
          console.log(`    Generation attempt ${attempts}, generated: ${genCount}, need: ${TARGET_PER_DIFFICULTY - validCount}`);
        }
        
        const puzzle = generatePuzzle(difficulty, seed++);
        if (!puzzle) continue;
        
        const key = puzzle.xsb;
        if (seen.has(key)) continue;
        seen.add(key);
        
        puzzle.id = validCount + 1;
        finalPuzzles[difficulty].push(puzzle);
        validCount++;
        genCount++;
      }
      
      console.log(`  Generated ${genCount} new puzzles`);
    }
  }
  
  console.log('\nSaving puzzles...');
  for (const difficulty of ['easy', 'medium', 'hard']) {
    console.log(`  Saving ${difficulty}...`);
    for (const puzzle of finalPuzzles[difficulty]) {
      const filename = `${difficulty}-${String(puzzle.id).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(puzzle, null, 2));
    }
  }
  
  const globalIndex = {
    easy: TARGET_PER_DIFFICULTY,
    medium: TARGET_PER_DIFFICULTY,
    hard: TARGET_PER_DIFFICULTY,
    total: TARGET_PER_DIFFICULTY * 3,
    difficultyThresholds: DIFFICULTY_THRESHOLDS,
    generated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(globalIndex, null, 2));
  
  console.log('\nDone!');
  console.log('Output saved to:', OUTPUT_DIR);
  console.log('File format: difficulty-XXXX.json (e.g., easy-0001.json)');
  console.log('Total puzzles: Easy', finalPuzzles.easy.length, ', Medium', finalPuzzles.medium.length, ', Hard', finalPuzzles.hard.length);
}

main().catch(console.error);
