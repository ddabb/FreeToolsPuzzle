const fs = require('fs');
const path = require('path');

function validateAnswer(puzzle) {
  if (!puzzle.answer || !Array.isArray(puzzle.answer) || puzzle.answer.length === 0) {
    return { valid: false, reason: 'no answer' };
  }

  const boxes = puzzle.boxes.map(b => [...b]);
  let player = [...puzzle.playerStart];
  const { grid, goals } = puzzle;

  for (let i = 0; i < puzzle.answer.length; i++) {
    const moveStr = puzzle.answer[i];
    const dir = moveStr[0];
    const boxIdx = moveStr.length > 1 ? parseInt(moveStr.substring(1)) - 1 : -1;

    let dx = 0, dy = 0;
    if (dir === 'R') dx = 1;
    else if (dir === 'L') dx = -1;
    else if (dir === 'D') dy = 1;
    else if (dir === 'U') dy = -1;
    else return { valid: false, reason: 'invalid direction: ' + dir };

    const nx = player[0] + dx;
    const ny = player[1] + dy;

    if (grid[nx] === undefined || grid[nx][ny] === undefined) {
      return { valid: false, reason: `step ${i+1}: player out of bounds (${nx},${ny})` };
    }

    if (grid[nx][ny] === 1) {
      return { valid: false, reason: `step ${i+1}: player hit wall (${nx},${ny})` };
    }

    if (boxIdx >= 0 && boxIdx < boxes.length) {
      const box = boxes[boxIdx];
      if (box[0] !== nx || box[1] !== ny) {
        return { valid: false, reason: `step ${i+1}: box ${boxIdx+1} not at player position` };
      }

      const bx = nx + dx;
      const by = ny + dy;

      if (grid[bx] === undefined || grid[bx][by] === undefined) {
        return { valid: false, reason: `step ${i+1}: box out of bounds (${bx},${by})` };
      }

      if (grid[bx][by] === 1) {
        return { valid: false, reason: `step ${i+1}: box hit wall (${bx},${by})` };
      }

      const otherBox = boxes.find((b, idx) => idx !== boxIdx && b[0] === bx && b[1] === by);
      if (otherBox) {
        return { valid: false, reason: `step ${i+1}: box collision at (${bx},${by})` };
      }

      boxes[boxIdx] = [bx, by];
    }

    player = [nx, ny];
  }

  const allBoxesOnGoals = boxes.every(box => 
    goals.some(g => g[0] === box[0] && g[1] === box[1])
  );

  if (!allBoxesOnGoals) {
    return { valid: false, reason: 'not all boxes on goals' };
  }

  return { valid: true, reason: 'ok' };
}

const files = fs.readdirSync('.').filter(f => f.match(/^(easy|medium|hard)-\d+\.json$/));
console.log('='.repeat(60));
console.log('Validating all Sokoban puzzles');
console.log('='.repeat(60));
console.log(`Total files to check: ${files.length}`);

let validCount = 0;
let invalidCount = 0;
let errorCount = 0;
const invalidFiles = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  if ((i + 1) % 100 === 0) {
    console.log(`Checked: ${i + 1}/${files.length}, Valid: ${validCount}, Invalid: ${invalidCount}, Errors: ${errorCount}`);
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = validateAnswer(data);
    
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      invalidFiles.push({ file, reason: result.reason });
    }
  } catch (e) {
    errorCount++;
    invalidFiles.push({ file, reason: 'parse error: ' + e.message });
  }
}

console.log('\n' + '='.repeat(60));
console.log('Validation Complete!');
console.log('='.repeat(60));
console.log(`Total files: ${files.length}`);
console.log(`Valid: ${validCount} (${((validCount / files.length) * 100).toFixed(1)}%)`);
console.log(`Invalid: ${invalidCount} (${((invalidCount / files.length) * 100).toFixed(1)}%)`);
console.log(`Errors: ${errorCount}`);

if (invalidFiles.length > 0) {
  console.log('\nInvalid files:');
  for (const item of invalidFiles.slice(0, 20)) {
    console.log(`  ${item.file}: ${item.reason}`);
  }
  if (invalidFiles.length > 20) {
    console.log(`  ... and ${invalidFiles.length - 20} more`);
  }
}

console.log('\n' + '='.repeat(60));
