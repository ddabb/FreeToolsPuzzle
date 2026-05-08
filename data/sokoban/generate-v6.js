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

// Test with different configs to find working parameters
const configs = [
  { w: 6, h: 6, b: 1, attempts: 50, desc: '6x6 1box' },
  { w: 7, h: 7, b: 2, attempts: 50, desc: '7x7 2box' },
  { w: 8, h: 8, b: 2, attempts: 50, desc: '8x8 2box' },
  { w: 8, h: 8, b: 3, attempts: 50, desc: '8x8 3box' },
  { w: 9, h: 9, b: 3, attempts: 50, desc: '9x9 3box' },
];

console.log('Testing configs to find best working ones...');

const workingConfigs = [];
for (const cfg of configs) {
  let success = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed, attempts: cfg.attempts, type: 'class' });
    if (grid && grid._solutionStep >= 0) success++;
  }
  console.log(`${cfg.desc}: ${success}/10 success`);
  if (success >= 5) workingConfigs.push(cfg);
}

console.log('\nWorking configs:', workingConfigs.map(c => c.desc));

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Generate puzzles using working configs
const TARGET = 1000;
const counts = { easy: 0, medium: 0, hard: 0 };
let seed = 1000;

while (counts.easy < TARGET || counts.medium < TARGET || counts.hard < TARGET) {
  const cfg = workingConfigs[Math.floor(Math.random() * workingConfigs.length)];
  const grid = generateSokobanLevel({ width: cfg.w, height: cfg.h, boxes: cfg.b, seed: seed++, attempts: cfg.attempts * 2, type: 'class' });
  
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
  fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.json`), JSON.stringify(puzzle, null, 2));
  
  // Progress
  if ((counts.easy + counts.medium + counts.hard) % 50 === 0) {
    console.log(`Progress: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);
  }
}

// Save index
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({
  total: counts.easy + counts.medium + counts.hard,
  easy: counts.easy, medium: counts.medium, hard: counts.hard,
  generated: new Date().toISOString()
}, null, 2));

console.log(`\nDone: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);