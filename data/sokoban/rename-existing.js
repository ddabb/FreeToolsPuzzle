const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname);

function getTimeStr() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
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

function getDifficulty(steps) {
  if (steps >= 10 && steps <= 20) return 'easy';
  if (steps >= 21 && steps <= 35) return 'medium';
  if (steps > 35) return 'hard';
  return null;
}

console.log('='.repeat(60));
console.log(`[${getTimeStr()}] Renaming puzzles to difficulty-XXXX.json format`);
console.log('='.repeat(60));

const files = fs.readdirSync(OUTPUT_DIR);
const jsonFiles = files.filter(f => f.match(/^\d+-\d+\.json$/));

console.log(`Found ${jsonFiles.length} JSON files to process`);

const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
let processed = 0;
let skipped = 0;
let renamed = 0;
let deleted = 0;

for (const file of jsonFiles) {
  const filepath = path.join(OUTPUT_DIR, file);
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    if (!data.answer || !validateAnswer(data)) {
      console.log(`[${getTimeStr()}] Delete ${file}: invalid answer`);
      fs.unlinkSync(filepath);
      deleted++;
      continue;
    }

    const actualSteps = data.answer.length;
    const difficulty = getDifficulty(actualSteps);

    if (!difficulty) {
      console.log(`[${getTimeStr()}] Delete ${file}: steps ${actualSteps} out of range`);
      fs.unlinkSync(filepath);
      deleted++;
      continue;
    }

    difficultyCounts[difficulty]++;
    const newId = difficultyCounts[difficulty];
    const newFilename = `${difficulty}-${String(newId).padStart(4, '0')}.json`;
    const newFilepath = path.join(OUTPUT_DIR, newFilename);

    if (file !== newFilename) {
      data.id = newId;
      data.difficulty = difficulty;
      data.actualSteps = actualSteps;
      
      fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2));
      fs.unlinkSync(filepath);
      console.log(`[${getTimeStr()}] Renamed: ${file} -> ${newFilename}`);
      renamed++;
    } else {
      data.id = newId;
      data.difficulty = difficulty;
      data.actualSteps = actualSteps;
      fs.writeFileSync(newFilepath, JSON.stringify(data, null, 2));
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`[${getTimeStr()}] Processed: ${processed}/${jsonFiles.length}`);
    }

  } catch (e) {
    console.log(`[${getTimeStr()}] Error processing ${file}: ${e.message}`);
    skipped++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`[${getTimeStr()}] Done!`);
console.log('='.repeat(60));
console.log(`  Processed: ${processed}`);
console.log(`  Renamed: ${renamed}`);
console.log(`  Deleted: ${deleted}`);
console.log(`  Skipped: ${skipped}`);
console.log('\nFinal distribution:');
console.log(`  Easy: ${difficultyCounts.easy}`);
console.log(`  Medium: ${difficultyCounts.medium}`);
console.log(`  Hard: ${difficultyCounts.hard}`);
console.log(`  Total: ${difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard}`);
console.log('='.repeat(60));
