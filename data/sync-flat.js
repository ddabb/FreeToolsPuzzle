const fs = require('fs');
const path = require('path');

const BASE = 'F:/SelfJob/FreeToolsPuzzle/data/one-stroke/';
['easy', 'medium', 'hard'].forEach(diff => {
  const subdir = `${BASE}${diff}/`;
  const files = fs.readdirSync(subdir).filter(f => f.endsWith('.json'));
  console.log(`${diff}: ${files.length} files in subdir`);
  files.forEach(f => {
    const src = path.join(subdir, f);
    const dst = `${BASE}${f}`;
    const srcData = JSON.parse(fs.readFileSync(src, 'utf8'));
    if (fs.existsSync(dst)) {
      const dstData = JSON.parse(fs.readFileSync(dst, 'utf8'));
      if (srcData.holes.length !== dstData.holes.length || srcData.answer.length !== dstData.answer.length) {
        fs.writeFileSync(dst, JSON.stringify(srcData));
        process.stdout.write('U');
      } else {
        process.stdout.write('.');
      }
    } else {
      fs.writeFileSync(dst, JSON.stringify(srcData));
      process.stdout.write('N');
    }
  });
  console.log('');
});
console.log('done');