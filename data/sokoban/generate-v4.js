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
      // Map: #=1(wall), space=0(floor), $=2(box), .=3(goal), *=2+3(box on goal), @=player, +=player on goal
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
        row.push(0); // floor
      }
    }
    grid.push(row);
  }

  // Match existing format
  return {
    id: 0,  // Will be updated
    difficulty: '',  // Will be updated
    rows,
    cols,
    boxCount: boxes.length,
    goalCount: goals.length,
    playerStart: playerStart || [0, 0],
    walls,
    boxes,
    goals,
    grid,
    xsb  // Keep original XSB for reference
  };
}

// Difficulty classification based on solution steps
function getDifficulty(steps) {
  if (steps <= 10) return 'easy';
  if (steps <= 30) return 'medium';
  return 'hard';
}

// Generate puzzles
function generate(targetCount = 1000) {
  const easy = [], medium = [], hard = [];
  let seed = 100000;
  let attempts = 0;
  const maxAttempts = targetCount * 50; // 50x oversampling

  console.log(`Generating ${targetCount} puzzles per difficulty...`);

  while ((easy.length < targetCount || medium.length < targetCount || hard.length < targetCount) && attempts < maxAttempts) {
    attempts++;
    
    // Try different sizes for variety
    const configs = [
      { w: 7, h: 7, b: 2 },
      { w: 8, h: 8, b: 2 },
      { w: 9, h: 9, b: 3 },
      { w: 8, h: 8, b: 3 },
      { w: 10, h: 10, b: 3 },
      { w: 10, h: 10, b: 4 },
    ];
    
    const config = configs[Math.floor(Math.random() * configs.length)];
    
    const grid = generateSokobanLevel({
      width: config.w,
      height: config.h,
      boxes: config.b,
      seed: seed++,
      attempts: 500,
      type: 'class'
    });

    if (!grid || grid._solutionStep < 0) continue;

    const steps = grid._solutionStep;
    const difficulty = getDifficulty(steps);
    
    // Check if we need more of this difficulty
    if ((difficulty === 'easy' && easy.length >= targetCount) ||
        (difficulty === 'medium' && medium.length >= targetCount) ||
        (difficulty === 'hard' && hard.length >= targetCount)) {
      continue;
    }

    const xsb = grid.toReadableString();
    const puzzle = xsbToJson(xsb);
    puzzle.id = (easy.length + medium.length + hard.length + 1);
    puzzle.difficulty = difficulty;

    if (difficulty === 'easy') easy.push(puzzle);
    else if (difficulty === 'medium') medium.push(puzzle);
    else hard.push(puzzle);

    // Progress
    const total = easy.length + medium.length + hard.length;
    if (total % 50 === 0) {
      console.log(`Progress: Easy ${easy.length}, Medium ${medium.length}, Hard ${hard.length}`);
    }
  }

  console.log(`\nFinal: Easy ${easy.length}, Medium ${medium.length}, Hard ${hard.length}`);
  console.log(`Total attempts: ${attempts}`);

  // Save
  const outDir = path.join(__dirname, 'sokoban');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Clear old files
  fs.readdirSync(outDir).forEach(f => {
    if (f.endsWith('.json') && !f.startsWith('index')) {
      fs.unlinkSync(path.join(outDir, f));
    }
  });

  // Save new files
  easy.forEach((p, i) => {
    p.id = i + 1;
    fs.writeFileSync(path.join(outDir, `easy-${(i+1).toString().padStart(4, '0')}.json`), JSON.stringify(p, null, 2));
  });
  medium.forEach((p, i) => {
    p.id = i + 1;
    fs.writeFileSync(path.join(outDir, `medium-${(i+1).toString().padStart(4, '0')}.json`), JSON.stringify(p, null, 2));
  });
  hard.forEach((p, i) => {
    p.id = i + 1;
    fs.writeFileSync(path.join(outDir, `hard-${(i+1).toString().padStart(4, '0')}.json`), JSON.stringify(p, null, 2));
  });

  // Save index
  const index = {
    total: easy.length + medium.length + hard.length,
    easy: easy.length,
    medium: medium.length,
    hard: hard.length,
    generated: new Date().toISOString()
  };
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));

  console.log(`\nSaved to ${outDir}`);
  return index;
}

generate(1000);