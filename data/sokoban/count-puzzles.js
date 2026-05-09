const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'sokoban');

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');

const counts = { easy: 0, medium: 0, hard: 0, unknown: 0 };

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
    if (data.difficulty === 'easy') counts.easy++;
    else if (data.difficulty === 'medium') counts.medium++;
    else if (data.difficulty === 'hard') counts.hard++;
    else counts.unknown++;
  } catch (e) {
    counts.unknown++;
  }
}

console.log('Puzzle counts:');
console.log('  Easy:', counts.easy);
console.log('  Medium:', counts.medium);
console.log('  Hard:', counts.hard);
console.log('  Unknown:', counts.unknown);
console.log('  Total:', files.length);
