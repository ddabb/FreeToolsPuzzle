// Batch verify all sokoban puzzles and add answer field
// Run: node batch-verify-all.js

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sokoban/sokoban';
const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sokoban';
const BATCH_SIZE = 100;
const MAX_STEPS = 3000;

// A* solver (same as before)
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

// Main
let allFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
console.log('Total puzzles: ' + allFiles.length);

// Load existing verified with answers
let verifiedWithAnswer = [];
const verifiedFile = path.join(OUTPUT_DIR, 'verified-with-answer.json');
if (fs.existsSync(verifiedFile)) {
  verifiedWithAnswer = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));
  console.log('Loaded ' + verifiedWithAnswer.length + ' pre-verified puzzles');
}

// Track progress
let solvable = 0;
let unsolvable = 0;
let errors = [];
const results = [];

// Process all files
for (let i = 0; i < allFiles.length; i++) {
  const file = allFiles[i];
  process.stdout.write('\rProcessing: ' + (i + 1) + '/' + allFiles.length + ' (' + solvable + ' solvable, ' + unsolvable + ' unsolvable)');
  
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    
    // Check if already has answer
    if (data.answer && data.answer.length > 0) {
      results.push(data);
      solvable++;
      continue;
    }
    
    const solution = solveSokoban(data, MAX_STEPS);
    
    if (solution) {
      const answer = solution.map(m => {
        const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
        return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
      });
      
      results.push({ ...data, answer });
      solvable++;
    } else {
      results.push({ ...data, answer: null });
      unsolvable++;
    }
  } catch (e) {
    errors.push(file + ': ' + e.message);
    results.push({ ...data, answer: null, _error: e.message });
    unsolvable++;
  }
}

console.log('\n\nDone!');
console.log('Solvable: ' + solvable + ', Unsolvable: ' + unsolvable + ', Errors: ' + errors.length);

// Save all results with answers
const outputPath = path.join(OUTPUT_DIR, 'all-with-answers.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log('Saved to: ' + outputPath);

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.slice(0, 10).forEach(e => console.log('  - ' + e));
}