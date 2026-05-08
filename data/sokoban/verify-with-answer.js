// Verify sokoban puzzles and record solution steps
// Run: node verify-with-answer.js

const fs = require('fs');
const path = require('path');

const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sokoban/sokoban';
const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/sokoban';
const SAMPLE_SIZE = 50;

// A* solver
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
const allFiles = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const sampleFiles = allFiles.slice(0, SAMPLE_SIZE);

console.log('Start verifying ' + SAMPLE_SIZE + ' puzzles...');

const verified = [];
const failed = [];

for (let i = 0; i < sampleFiles.length; i++) {
  const file = sampleFiles[i];
  process.stdout.write('\rVerifying: ' + (i + 1) + '/' + SAMPLE_SIZE);
  
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const solution = solveSokoban(data, 3000);
    
    if (solution) {
      const answer = solution.map(m => {
        const dirName = m.dx === 1 ? 'R' : m.dx === -1 ? 'L' : m.dy === 1 ? 'D' : 'U';
        return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
      });
      
      verified.push({
        ...data,
        answer,
        _source: file
      });
    } else {
      failed.push(file);
    }
  } catch (e) {
    failed.push(file + ': ' + e.message);
  }
}

console.log('\n\nDone!');
console.log('Solvable: ' + verified.length + ', Unsolvable: ' + failed.length);

// Save verified puzzles
const outputPath = path.join(OUTPUT_DIR, 'verified-with-answer.json');
fs.writeFileSync(outputPath, JSON.stringify(verified, null, 2));
console.log('Saved to: ' + outputPath);

if (failed.length > 0) {
  console.log('\nUnsolvable:');
  failed.forEach(f => console.log('  - ' + f));
}