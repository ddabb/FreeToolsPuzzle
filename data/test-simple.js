/**
 * 简单测试数回验证器
 */

const fs = require('fs');
const path = require('path');
const validateSlitherLink = require('./validators/slither-link');

const gameDir = path.join(__dirname, 'slither-link');
const file = 'easy-0001.json';

const filePath = path.join(gameDir, file);
const content = fs.readFileSync(filePath, 'utf8');
const puzzle = JSON.parse(content);

console.log('Testing puzzle:', JSON.stringify(puzzle, null, 2));

try {
  const result = validateSlitherLink(puzzle);
  console.log('Result:', result);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}