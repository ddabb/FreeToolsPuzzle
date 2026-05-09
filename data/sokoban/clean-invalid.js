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

const files = fs.readdirSync('.').filter(f => f.match(/^\d+-\d+\.json$/));
let deleted = 0;
let kept = 0;

for (const file of files) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!validateAnswer(data)) {
      fs.unlinkSync(file);
      console.log('Deleted:', file);
      deleted++;
    } else {
      kept++;
    }
  } catch (e) {
    fs.unlinkSync(file);
    console.log('Deleted (error):', file);
    deleted++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Cleanup Complete!`);
console.log(`Deleted: ${deleted}`);
console.log(`Kept: ${kept}`);
console.log('='.repeat(60));
