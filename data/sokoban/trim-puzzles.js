const fs = require('fs');

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
    if (dir === 'R') dx = 1;
    else if (dir === 'L') dx = -1;
    else if (dir === 'D') dy = 1;
    else if (dir === 'U') dy = -1;
    else return false;

    const nx = player[0] + dx;
    const ny = player[1] + dy;

    if (grid[nx] === undefined || grid[nx][ny] === undefined) return false;
    if (grid[nx][ny] === 1) return false;

    if (boxIdx >= 0 && boxIdx < boxes.length) {
      const box = boxes[boxIdx];
      if (box[0] !== nx || box[1] !== ny) return false;

      const bx = nx + dx;
      const by = ny + dy;

      if (grid[bx] === undefined || grid[bx][by] === undefined) return false;
      if (grid[bx][by] === 1) return false;

      const otherBox = boxes.find((b, i) => i !== boxIdx && b[0] === bx && b[1] === by);
      if (otherBox) return false;

      boxes[boxIdx] = [bx, by];
    }

    player = [nx, ny];
  }

  return boxes.every(box => goals.some(g => g[0] === box[0] && g[1] === box[1]));
}

const TARGET_EASY = 1000;
const TARGET_MEDIUM = 1000;

const files = fs.readdirSync('.').filter(f => f.match(/^\d+-\d+\.json$/));

const easyFiles = [];
const mediumFiles = [];
const hardFiles = [];
const invalidFiles = [];

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!validateAnswer(data)) {
      invalidFiles.push(file);
      continue;
    }
    const steps = data.actualSteps || data.answer?.length || 0;
    if (steps < 10) {
      invalidFiles.push(file);
    } else if (steps <= 20) {
      easyFiles.push(file);
    } else if (steps <= 35) {
      mediumFiles.push(file);
    } else {
      hardFiles.push(file);
    }
  } catch (e) {
    invalidFiles.push(file);
  }
}

console.log('='.repeat(60));
console.log('Puzzle Trimming Report');
console.log('='.repeat(60));
console.log(`Total files: ${files.length}`);
console.log(`Very Easy (<10): ${invalidFiles.length} (to delete)`);
console.log(`Easy (10-20): ${easyFiles.length} (keep ${TARGET_EASY})`);
console.log(`Medium (21-35): ${mediumFiles.length} (keep ${TARGET_MEDIUM})`);
console.log(`Hard (>35): ${hardFiles.length} (keep all)`);

let deleted = 0;

console.log('\nDeleting Very Easy (<10 steps)...');
for (const file of invalidFiles) {
  fs.unlinkSync(file);
  deleted++;
}

console.log(`\nDeleting extra Easy puzzles (keeping ${TARGET_EASY})...`);
if (easyFiles.length > TARGET_EASY) {
  const toDelete = easyFiles.slice(TARGET_EASY);
  for (const file of toDelete) {
    fs.unlinkSync(file);
    deleted++;
  }
  console.log(`  Deleted ${toDelete.length} extra Easy puzzles`);
}

console.log(`\nDeleting extra Medium puzzles (keeping ${TARGET_MEDIUM})...`);
if (mediumFiles.length > TARGET_MEDIUM) {
  const toDelete = mediumFiles.slice(TARGET_MEDIUM);
  for (const file of toDelete) {
    fs.unlinkSync(file);
    deleted++;
  }
  console.log(`  Deleted ${toDelete.length} extra Medium puzzles`);
}

console.log('\n' + '='.repeat(60));
console.log(`Trimming Complete!`);
console.log(`Total deleted: ${deleted}`);

const remaining = fs.readdirSync('.').filter(f => f.match(/^\d+-\d+\.json$/)).length;
console.log(`Remaining puzzles: ${remaining}`);

const finalEasy = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) >= 10 && parseInt(match[1]) <= 20;
}).length;

const finalMedium = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) > 20 && parseInt(match[1]) <= 35;
}).length;

const finalHard = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) > 35;
}).length;

console.log(`Easy (10-20): ${finalEasy}`);
console.log(`Medium (21-35): ${finalMedium}`);
console.log(`Hard (>35): ${finalHard}`);
console.log('='.repeat(60));
