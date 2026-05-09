const fs = require('fs');

const MAX_HARD_STEPS = 55;

const files = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) > MAX_HARD_STEPS;
});

console.log('='.repeat(60));
console.log(`Trimming Hard puzzles > ${MAX_HARD_STEPS} steps`);
console.log('='.repeat(60));
console.log(`Found ${files.length} puzzles to delete:`);

let deleted = 0;
for (const file of files) {
  fs.unlinkSync(file);
  console.log(`Deleted: ${file}`);
  deleted++;
}

console.log('\n' + '='.repeat(60));
console.log(`Trimming Complete!`);
console.log(`Deleted ${deleted} puzzles`);

const remaining = fs.readdirSync('.').filter(f => f.match(/^\d+-\d+\.json$/)).length;
console.log(`Remaining puzzles: ${remaining}`);

const hardCount = fs.readdirSync('.').filter(f => {
  const match = f.match(/^(\d+)-\d+\.json$/);
  return match && parseInt(match[1]) > 35 && parseInt(match[1]) <= MAX_HARD_STEPS;
}).length;

console.log(`Hard puzzles (36-${MAX_HARD_STEPS} steps): ${hardCount}`);
console.log('='.repeat(60));
