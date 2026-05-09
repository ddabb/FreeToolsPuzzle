const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'sokoban');
const OUTPUT_DIR = path.join(__dirname, 'cdn-data');
const TARGET_PER_DIFFICULTY = 1000;
const MAX_SOLVE_STEPS = 5000;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  ['easy', 'medium', 'hard'].forEach(d => fs.mkdirSync(path.join(OUTPUT_DIR, d), { recursive: true }));
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

function getDifficulty(steps) {
  if (steps <= 10) return 'easy';
  if (steps <= 30) return 'medium';
  return 'hard';
}

function solveSokoban(level, maxSteps = MAX_SOLVE_STEPS) {
  const { rows: height, cols: width, walls, boxes, goals, playerStart: player } = level;
  
  const key = (state) => state.player.join(',') + '|' + state.boxes.map(b=>b.join(',')).sort().join('|');
  
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

async function loadExistingPuzzles() {
  const puzzles = { easy: [], medium: [], hard: [] };
  
  if (!fs.existsSync(RAW_DIR)) {
    console.log('No raw puzzles directory found');
    return puzzles;
  }
  
  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
  
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
      if (data.difficulty && puzzles[data.difficulty]) {
        puzzles[data.difficulty].push(data);
      }
    } catch (e) {
      console.error(`Failed to load ${file}:`, e.message);
    }
  }
  
  console.log(`Loaded: Easy ${puzzles.easy.length}, Medium ${puzzles.medium.length}, Hard ${puzzles.hard.length}`);
  return puzzles;
}

async function processPuzzles() {
  const existing = await loadExistingPuzzles();
  const finalPuzzles = { easy: [], medium: [], hard: [] };
  const seen = new Set();
  
  for (const difficulty of ['easy', 'medium', 'hard']) {
    console.log(`\nProcessing ${difficulty} puzzles...`);
    
    for (const puzzle of existing[difficulty]) {
      const key = puzzle.xsb || puzzle.grid?.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      
      if (!puzzle.answer || puzzle.answer.length === 0) {
        const solution = solveSokoban(puzzle);
        if (solution) {
          puzzle.answer = solution.map(m => {
            const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
            return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
          });
        } else {
          console.log(`  Skipping unsolvable puzzle`);
          continue;
        }
      }
      
      finalPuzzles[difficulty].push(puzzle);
      if (finalPuzzles[difficulty].length >= TARGET_PER_DIFFICULTY) break;
    }
    
    console.log(`  After filtering: ${finalPuzzles[difficulty].length} valid puzzles`);
  }
  
  const workingConfigs = [
    { w: 6, h: 6, b: 1, attempts: 200 },
    { w: 7, h: 7, b: 2, attempts: 200 },
    { w: 8, h: 8, b: 2, attempts: 200 },
    { w: 8, h: 8, b: 3, attempts: 200 },
    { w: 9, h: 9, b: 3, attempts: 200 },
  ];
  
  for (const difficulty of ['easy', 'medium', 'hard']) {
    if (finalPuzzles[difficulty].length >= TARGET_PER_DIFFICULTY) continue;
    
    console.log(`\nGenerating additional ${difficulty} puzzles...`);
    let seed = Date.now();
    let attempts = 0;
    
    while (finalPuzzles[difficulty].length < TARGET_PER_DIFFICULTY) {
      attempts++;
      if (attempts % 100 === 0) {
        console.log(`  Attempt ${attempts}, have ${finalPuzzles[difficulty].length}/${TARGET_PER_DIFFICULTY}`);
      }
      
      const cfg = workingConfigs[Math.floor(Math.random() * workingConfigs.length)];
      const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed: seed++, attempts: cfg.attempts, type: 'class' });
      
      if (!grid || grid._solutionStep < 0) continue;
      
      const steps = grid._solutionStep;
      const puzzleDifficulty = getDifficulty(steps);
      
      if (puzzleDifficulty !== difficulty) continue;
      
      const puzzle = xsbToJson(grid.toReadableString(), difficulty, finalPuzzles[difficulty].length + 1);
      
      const key = puzzle.xsb;
      if (seen.has(key)) continue;
      seen.add(key);
      
      const solution = solveSokoban(puzzle);
      if (!solution) continue;
      
      puzzle.answer = solution.map(m => {
        const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
        return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
      });
      
      finalPuzzles[difficulty].push(puzzle);
    }
  }
  
  for (const difficulty of ['easy', 'medium', 'hard']) {
    console.log(`\nSaving ${difficulty} puzzles...`);
    
    finalPuzzles[difficulty].forEach((puzzle, idx) => {
      puzzle.id = idx + 1;
      const filename = `${difficulty}-${String(idx + 1).padStart(4, '0')}.json`;
      const filepath = path.join(OUTPUT_DIR, difficulty, filename);
      fs.writeFileSync(filepath, JSON.stringify(puzzle, null, 2));
    });
    
    const index = {
      total: finalPuzzles[difficulty].length,
      difficulty,
      generated: new Date().toISOString()
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, difficulty, 'index.json'), JSON.stringify(index, null, 2));
  }
  
  const globalIndex = {
    easy: finalPuzzles.easy.length,
    medium: finalPuzzles.medium.length,
    hard: finalPuzzles.hard.length,
    total: finalPuzzles.easy.length + finalPuzzles.medium.length + finalPuzzles.hard.length,
    generated: new Date().toISOString()
  };
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(globalIndex, null, 2));
  
  console.log('\nDone!');
  console.log(`Final counts: Easy ${finalPuzzles.easy.length}, Medium ${finalPuzzles.medium.length}, Hard ${finalPuzzles.hard.length}`);
  console.log(`Output saved to: ${OUTPUT_DIR}`);
}

processPuzzles().catch(console.error);
