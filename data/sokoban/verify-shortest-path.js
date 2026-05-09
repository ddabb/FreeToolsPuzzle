const fs = require('fs');
const path = require('path');

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

const files = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) > 35;
});

console.log('='.repeat(60));
console.log('Verifying Shortest Path for Hard Puzzles');
console.log('='.repeat(60));
console.log(`Total Hard puzzles: ${files.length}`);

let confirmed = 0;
let different = 0;
let errors = 0;

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  if ((i + 1) % 50 === 0) {
    console.log(`Checked: ${i + 1}/${files.length}, Confirmed: ${confirmed}, Different: ${different}, Errors: ${errors}`);
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const puzzle = {
      rows: data.rows,
      cols: data.cols,
      walls: data.walls,
      boxes: data.boxes.map(b => [...b]),
      goals: data.goals,
      playerStart: [...data.playerStart]
    };

    const solution = solveSokoban(puzzle);
    if (!solution) {
      errors++;
      continue;
    }

    const originalSteps = data.actualSteps || data.answer?.length || 0;
    const newSteps = solution.length;

    if (originalSteps === newSteps) {
      confirmed++;
    } else {
      different++;
      console.log(`Different: ${file} - Original: ${originalSteps}, New: ${newSteps}`);
    }
  } catch (e) {
    errors++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('Verification Complete!');
console.log('='.repeat(60));
console.log(`Total Hard puzzles: ${files.length}`);
console.log(`Confirmed shortest path: ${confirmed} (${((confirmed / files.length) * 100).toFixed(1)}%)`);
console.log(`Different path length: ${different} (${((different / files.length) * 100).toFixed(1)}%)`);
console.log(`Errors: ${errors}`);
console.log('='.repeat(60));
