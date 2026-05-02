const fs = require('fs');
const files = fs.readdirSync('F:/SelfJob/FreeToolsPuzzle/data/nurikabe').filter(f => f.endsWith('.json'));
const easy = files.filter(f => f.startsWith('easy')).length;
const med = files.filter(f => f.startsWith('medium')).length;
const hard = files.filter(f => f.startsWith('hard')).length;
console.log(`easy:${easy} medium:${med} hard:${hard}`);
