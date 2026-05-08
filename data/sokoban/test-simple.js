const { generateSokobanLevel } = require('sokoban-generator');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'sokoban');

// Simple test: generate one puzzle and write it
console.log('Testing generation...');

const grid = generateSokobanLevel({
  width: 7, height: 7, boxes: 2,
  seed: 12345, attempts: 100, type: 'class'
});

if (!grid) {
  console.log('FAIL: generateSokobanLevel returned null');
  process.exit(1);
}

console.log('Generated! Steps:', grid._solutionStep);

// Write to file
const xsb = grid.toReadableString();
const testFile = path.join(OUTPUT_DIR, 'test-output.json');
fs.writeFileSync(testFile, xsb);
console.log('Wrote to:', testFile);
console.log('Content:', xsb);