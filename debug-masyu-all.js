const fs = require('fs');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

function checkPuzzle(filepath) {
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const size = data.size;
    const grid = data.grid;
    const lines = data.lines;

    let invalidCells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const l = lines[r][c];
        const ec = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
        if (ec !== 2 && ec !== 0) {
          invalidCells.push({r, c, ec});
        }
      }
    }
    return { valid: invalidCells.length === 0, invalidCells };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

const difficulties = ['easy', 'medium', 'hard'];
const counts = { easy: 702, medium: 0, hard: 0 };

for (const diff of difficulties) {
  const dir = `F:/SelfJob/FreeToolsPuzzle/data/masyu/${diff}`;
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const maxCount = counts[diff] || files.length;

  let validCount = 0, invalidCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < Math.min(files.length, maxCount); i++) {
    const file = files[i];
    const filepath = `${dir}/${file}`;
    const result = checkPuzzle(filepath);

    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      if (invalidCount <= 5) {
        console.log(`${file}: INVALID - ${result.invalidCells ? JSON.stringify(result.invalidCells) : result.error}`);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`${diff}: valid=${validCount}, invalid=${invalidCount} (${elapsed}s)`);
}