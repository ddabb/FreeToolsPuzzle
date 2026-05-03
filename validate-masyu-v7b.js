const fs = require('fs');

function validate(dir, count) {
  let failCount = 0;
  for (let i = 1; i <= count; i++) {
    const file = `F:/SelfJob/FreeToolsPuzzle/data/masyu/${dir}/${dir}-${String(i).padStart(4, '0')}.json`;
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const lines = d.lines;
    for (let r = 0; r < d.size; r++) {
      for (let c = 0; c < d.size; c++) {
        if (d.grid[r][c] === 0) continue;
        const cell = lines[r][c];
        const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
        const isWhite = d.grid[r][c] === 2;
        const isBlack = d.grid[r][c] === 1;
        if (isWhite && !isStraight) {
          console.log(`FAIL ${file} (${r},${c}) white but corner`);
          failCount++;
        }
        if (isBlack && isStraight) {
          console.log(`FAIL ${file} (${r},${c}) black but straight`);
          failCount++;
        }
      }
    }
  }
  return failCount;
}

let f1 = validate('easy', 50);
let f2 = validate('medium', 50);
let f3 = validate('hard', 50);

console.log(`Easy: ${f1} fails, Medium: ${f2} fails, Hard: ${f3} fails`);

// Print sample
const sample = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/masyu/easy/easy-0001.json', 'utf8'));
console.log('\nSample easy-0001:');
console.log('grid:', JSON.stringify(sample.grid));
console.log('pearlCount:', sample.pearlCount, 'black:', sample.blackCount, 'white:', sample.whiteCount);

// Check black/white ratio across samples
for (const diff of ['easy', 'medium', 'hard']) {
  let totalBlack = 0, totalWhite = 0;
  for (let i = 1; i <= 100; i++) {
    const d = JSON.parse(fs.readFileSync(`F:/SelfJob/FreeToolsPuzzle/data/masyu/${diff}/${diff}-${String(i).padStart(4, '0')}.json`, 'utf8'));
    totalBlack += d.blackCount;
    totalWhite += d.whiteCount;
  }
  console.log(`${diff}: avg black=${(totalBlack/100).toFixed(1)} avg white=${(totalWhite/100).toFixed(1)} ratio=${(totalBlack/(totalBlack+totalWhite)*100).toFixed(0)}% black`);
}
