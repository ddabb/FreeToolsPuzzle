const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'sokoban');

// XSB format: #=wall, @=player, $=box, .=goal, *=box on goal, +=player on goal
function xsbToJson(xsb) {
  const lines = xsb.trim().split('\n').map(l => l.trimEnd());
  const rows = lines.length;
  const cols = Math.max(...lines.map(l => l.length));
  
  const grid = [];
  const walls = [];
  const boxes = [];
  const goals = [];
  let playerStart = null;

  for (let r = 0; r < rows; r++) {
    const row = [];
    const line = lines[r] || '';
    for (let c = 0; c < cols; c++) {
      const ch = line[c] || ' ';
      if (ch === '#') {
        row.push(1);
        walls.push([r, c]);
      } else if (ch === '$') {
        row.push(0);
        boxes.push([r, c]);
      } else if (ch === '.') {
        row.push(0);
        goals.push([r, c]);
      } else if (ch === '*') {
        row.push(0);
        boxes.push([r, c]);
        goals.push([r, c]);
      } else if (ch === '@') {
        row.push(0);
        playerStart = [r, c];
      } else if (ch === '+') {
        row.push(0);
        playerStart = [r, c];
        goals.push([r, c]);
      } else {
        row.push(0);
      }
    }
    grid.push(row);
  }

  return {
    rows, cols,
    boxCount: boxes.length,
    goalCount: goals.length,
    playerStart: playerStart || [0, 0],
    walls, boxes, goals, grid
  };
}

function getDifficulty(steps) {
  if (steps <= 10) return 'easy';
  if (steps <= 30) return 'medium';
  return 'hard';
}

function generate(targetPerDifficulty = 500) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  let seed = 100000;
  let attempts = 0;
  const maxAttempts = targetPerDifficulty * 30;
  const indexFile = path.join(OUTPUT_DIR, 'index.json');

  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Load existing index if any
  let index = { easy: 0, medium: 0, hard: 0, total: 0 };
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      counts.easy = index.easy || 0;
      counts.medium = index.medium || 0;
      counts.hard = index.hard || 0;
    } catch(e) {}
  }

  console.log(`Starting: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);
  console.log(`Target: ${targetPerDifficulty} each`);

  const configs = [
    { w: 7, h: 7, b: 2 },
    { w: 8, h: 8, b: 2 },
    { w: 9, h: 9, b: 3 },
    { w: 8, h: 8, b: 3 },
    { w: 10, h: 10, b: 3 },
    { w: 10, h: 10, b: 4 },
  ];

  while ((counts.easy < targetPerDifficulty || counts.medium < targetPerDifficulty || counts.hard < targetPerDifficulty) && attempts < maxAttempts) {
    attempts++;
    
    const config = configs[Math.floor(Math.random() * configs.length)];
    const grid = generateSokobanLevel({
      width: config.w, height: config.h, boxes: config.b,
      seed: seed++, attempts: 300, type: 'class'
    });

    if (!grid || grid._solutionStep < 0) continue;

    const steps = grid._solutionStep;
    const difficulty = getDifficulty(steps);
    
    if ((difficulty === 'easy' && counts.easy >= targetPerDifficulty) ||
        (difficulty === 'medium' && counts.medium >= targetPerDifficulty) ||
        (difficulty === 'hard' && counts.hard >= targetPerDifficulty)) {
      continue;
    }

    counts[difficulty]++;
    const id = `${difficulty}-${counts[difficulty].toString().padStart(4, '0')}`;
    
    const puzzle = xsbToJson(grid.toReadableString());
    puzzle.id = counts[difficulty];
    puzzle.difficulty = difficulty;
    
    // Write IMMEDIATELY
    fs.writeFileSync(path.join(OUTPUT_DIR, `${id}.json`), JSON.stringify(puzzle, null, 2));

    // Update index
    index = {
      easy: counts.easy,
      medium: counts.medium,
      hard: counts.hard,
      total: counts.easy + counts.medium + counts.hard,
      generated: new Date().toISOString()
    };
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));

    // Progress every 50
    if ((counts.easy + counts.medium + counts.hard) % 50 === 0) {
      console.log(`Progress: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);
    }
  }

  console.log(`Done: Easy ${counts.easy}, Medium ${counts.medium}, Hard ${counts.hard}`);
  return index;
}

generate(500);