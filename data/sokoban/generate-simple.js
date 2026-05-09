const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname);
const TARGET_TOTAL = 1000;
const SOLVE_TIMEOUT = 500;
const MIN_STEPS = 35;
const MAX_STEPS = 55;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getTimeStr() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

function countPushes(answer) {
  return answer.filter(m => m.length > 1).length;
}

console.log('Script starting...');
console.log('OUTPUT_DIR:', OUTPUT_DIR);
console.log('Solve timeout:', SOLVE_TIMEOUT, 'ms');
console.log('Steps range:', MIN_STEPS + ' - ' + MAX_STEPS);

function xsbToJson(xsb, id) {
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

  return { id, rows, cols, boxCount: boxes.length, goalCount: goals.length, playerStart: playerStart||[0,0], walls, boxes, goals, grid, xsb };
}

function solveSokoban(level, maxSteps = 2000, timeout = SOLVE_TIMEOUT) {
  const { rows: height, cols: width, walls, boxes, goals, playerStart: player } = level;
  const startTime = Date.now();

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

  let iteration = 0;
  while (openSet.length > 0) {
    iteration++;
    if (iteration % 1000 === 0) {
      if (Date.now() - startTime > timeout) {
        return null;
      }
    }

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

function validateAnswer(puzzle) {
  if (!puzzle.answer || !Array.isArray(puzzle.answer) || puzzle.answer.length === 0) {
    return false;
  }

  const boxes = puzzle.boxes.map(b => [...b]);
  let player = [...puzzle.playerStart];
  const { grid, goals } = puzzle;

  for (const moveStr of puzzle.answer) {
    const dir = moveStr[0];
    const boxIdx = moveStr.length > 1 ? parseInt(moveStr.substring(1)) - 1 : -1;

    let dx = 0, dy = 0;
    // 方向解码：D=下(dx=1), U=上(dx=-1), R=右(dy=1), L=左(dy=-1)
    if (dir === 'D') dx = 1;
    else if (dir === 'U') dx = -1;
    else if (dir === 'R') dy = 1;
    else if (dir === 'L') dy = -1;
    else return false;

    const nx = player[0] + dx;
    const ny = player[1] + dy;

    if (grid[nx] && grid[nx][ny] === 1) return false;

    if (boxIdx >= 0 && boxIdx < boxes.length) {
      const box = boxes[boxIdx];
      if (box[0] !== nx || box[1] !== ny) return false;

      const bx = nx + dx;
      const by = ny + dy;

      if (grid[bx] && grid[bx][by] === 1) return false;

      const otherBox = boxes.find((b, i) => i !== boxIdx && b[0] === bx && b[1] === by);
      if (otherBox) return false;

      boxes[boxIdx] = [bx, by];
    }

    player = [nx, ny];
  }

  return boxes.every(box => goals.some(g => g[0] === box[0] && g[1] === box[1]));
}

function loadExistingPuzzles() {
  const existing = [];

  console.log('Scanning directory:', OUTPUT_DIR);
  const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json') && f !== 'index.json' && f !== 'verified-with-answer.json');
  console.log('Found files:', files.length);

  for (const file of files) {
    const match = file.match(/^hard-(\d+)\.json$/);
    if (!match) continue;

    const id = parseInt(match[1]);

    try {
      const filepath = path.join(OUTPUT_DIR, file);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      if (data.answer && validateAnswer(data)) {
        const steps = data.actualSteps || data.answer?.length || 0;
        existing.push({ steps, id, data });
      }
    } catch (e) {
    }
  }

  return existing;
}

const workingConfigs = [
  { w: 7, h: 7, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 2, attempts: 200 },
  { w: 8, h: 8, b: 3, attempts: 200 },
  { w: 9, h: 9, b: 2, attempts: 200 },
  { w: 9, h: 9, b: 3, attempts: 200 },
  { w: 10, h: 10, b: 3, attempts: 200 },
  { w: 10, h: 10, b: 4, attempts: 200 },
];

let timeoutCount = 0;

function generatePuzzle(seed) {
  const cfg = workingConfigs[Math.floor(Math.random() * workingConfigs.length)];
  const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed, attempts: cfg.attempts, type: 'class' });

  if (!grid || grid._solutionStep < 0) return null;

  const puzzle = xsbToJson(grid.toReadableString(), 0);
  puzzle.solutionSteps = grid._solutionStep;

  const solveStartTime = Date.now();
  const solution = solveSokoban(puzzle, 3000, SOLVE_TIMEOUT);
  const solveTime = Date.now() - solveStartTime;

  if (!solution) {
    if (solveTime >= SOLVE_TIMEOUT) {
      timeoutCount++;
    }
    return null;
  }

  puzzle.answer = solution.map(m => {
    // 方向编码：dx对应行(上下), dy对应列(左右)
    // dx=1→下(D), dx=-1→上(U), dy=1→右(R), dy=-1→左(L)
    const dirName = m.dx === 1 ? 'D' : m.dx === -1 ? 'U' : m.dy === 1 ? 'R' : 'L';
    return m.pushBox >= 0 ? dirName + (m.pushBox + 1) : dirName;
  });

  puzzle.actualSteps = puzzle.answer.length;
  puzzle.pushCount = countPushes(puzzle.answer);

  if (puzzle.pushCount === 0) return null;
  if (puzzle.actualSteps <= MIN_STEPS) return null;
  if (puzzle.actualSteps > MAX_STEPS) return null;

  return puzzle;
}

async function main() {
  console.log('='.repeat(60));
  console.log(`[${getTimeStr()}] Sokoban Puzzle Generator (Hard only)`);
  console.log('='.repeat(60));
  console.log(`  Target total: ${TARGET_TOTAL}`);
  console.log(`  Output directory: ${OUTPUT_DIR}`);
  console.log(`  Solve timeout: ${SOLVE_TIMEOUT}ms`);
  console.log(`  Min steps: ${MIN_STEPS}`);
  console.log('='.repeat(60));

  console.log(`\n[${getTimeStr()}] Loading existing puzzles (steps > ${MIN_STEPS})...`);
  const existing = loadExistingPuzzles();
  console.log(`[${getTimeStr()}] Found existing: ${existing.length} puzzles`);

  const seen = new Set();
  for (const item of existing) {
    seen.add(item.data.xsb);
  }

  const counts = { total: existing.length };
  const stepStats = [];

  for (const item of existing) {
    stepStats.push(item.steps);
  }

  let seed = Date.now();
  let attempts = 0;
  let noSolutionCount = 0;
  let duplicateCount = 0;
  let filteredCount = 0;
  let startTime = Date.now();
  let lastProgressTime = Date.now();
  let lastOutputTime = Date.now();

  const stepCounts = {};

  console.log(`\n[${getTimeStr()}] Starting generation...\n`);

  while (counts.total < TARGET_TOTAL) {
    attempts++;

    const now = Date.now();
    if (now - lastProgressTime > 5000) {
      const elapsed = Math.floor((now - startTime) / 1000);
      const rate = attempts / Math.max(elapsed, 1);
      const remaining = TARGET_TOTAL - counts.total;
      const eta = Math.floor(remaining / Math.max(rate * 0.1, 0.1));
      console.log(`[${getTimeStr()}] [${attempts}] Status: ${counts.total}/${TARGET_TOTAL}, Elapsed: ${elapsed}s, Rate: ${rate.toFixed(1)}/s, ETA: ${eta}s`);
      lastProgressTime = now;
    }

    const puzzle = generatePuzzle(seed++);

    if (!puzzle) {
      noSolutionCount++;
      if (now - lastOutputTime > 10000) {
        console.log(`[${getTimeStr()}] No solution: ${noSolutionCount}, Timeout: ${timeoutCount}, Filtered: ${filteredCount}, attempts: ${attempts}`);
        lastOutputTime = now;
      }
      continue;
    }

    const key = puzzle.xsb;
    if (seen.has(key)) {
      duplicateCount++;
      continue;
    }
    seen.add(key);

    const steps = puzzle.actualSteps;
    const stepKey = String(steps);
    stepCounts[stepKey] = (stepCounts[stepKey] || 0) + 1;

    counts.total++;
    stepStats.push(steps);

    puzzle.id = counts.total;
    puzzle.difficulty = 'hard';
    const filename = `hard-${String(counts.total).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(puzzle, null, 2));

    console.log(`[${getTimeStr()}] [${attempts}] Generated: ${filename} (steps: ${steps}, pushes: ${puzzle.pushCount})`);

    if (counts.total % 50 === 0) {
      console.log(`[${getTimeStr()}]   Progress: ${counts.total}/${TARGET_TOTAL}`);
    }
  }

  const elapsed = Math.floor((Date.now() - startTime) / 1000);

  console.log('\n'.repeat(2) + '='.repeat(60));
  console.log(`[${getTimeStr()}] Generation Complete!`);
  console.log('='.repeat(60));
  console.log('Statistics:');
  console.log(`  Total generated: ${counts.total}`);
  console.log(`  Total attempts: ${attempts}`);
  console.log(`  Elapsed time:   ${elapsed} seconds`);
  console.log(`  Generation rate: ${(attempts / elapsed).toFixed(1)} attempts/second`);
  console.log(`  No solution:    ${noSolutionCount}`);
  console.log(`  Timeout:        ${timeoutCount}`);
  console.log(`  Duplicates:     ${duplicateCount}`);
  console.log(`  Filtered (<=${MIN_STEPS}): ${filteredCount}`);

  const avg = stepStats.reduce((a, b) => a + b, 0) / stepStats.length;
  const min = Math.min(...stepStats);
  const max = Math.max(...stepStats);
  console.log(`\nStep Statistics (${stepStats.length} puzzles):`);
  console.log(`  Average steps: ${avg.toFixed(2)}`);
  console.log(`  Minimum steps: ${min}`);
  console.log(`  Maximum steps: ${max}`);

  const sortedSteps = [...stepStats].sort((a, b) => a - b);
  const p25 = sortedSteps[Math.floor(sortedSteps.length * 0.25)];
  const p50 = sortedSteps[Math.floor(sortedSteps.length * 0.50)];
  const p75 = sortedSteps[Math.floor(sortedSteps.length * 0.75)];
  console.log(`  P25: ${p25}, P50: ${p50}, P75: ${p75}`);

  console.log(`\nStep Distribution:`);
  const stepKeys = Object.keys(stepCounts).map(Number).sort((a, b) => a - b);
  for (const s of stepKeys) {
    console.log(`  ${s} steps: ${stepCounts[s]} puzzles`);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'hard-index.json'), JSON.stringify({
    total: counts.total,
    minSteps: MIN_STEPS,
    generated: new Date().toISOString(),
    statistics: {
      totalAttempts: attempts,
      noSolutionCount,
      timeoutCount,
      duplicateCount,
      elapsedSeconds: elapsed,
      avgSteps: avg,
      minSteps: min,
      maxSteps: max,
      p25, p50, p75,
      stepDistribution: stepCounts,
      existingLoaded: existing.length
    }
  }, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log(`[${getTimeStr()}] Output saved to: ${OUTPUT_DIR}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error(`[${getTimeStr()}] Error:`, err);
  process.exit(1);
});