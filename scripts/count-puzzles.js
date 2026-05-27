const fs = require('fs');
const path = require('path');
const dirs = ['bridges','sokoban','number-one','nurikabe','hitori','minesweeper','sudoku','tents','battleship','24point','othello','merge-abc','frog-escape'];
dirs.forEach(d => {
  const dp = path.join('F:/SelfJob/FreeToolsPuzzle/data', d);
  if (!fs.existsSync(dp)) { console.log(d + ': NOT FOUND'); return; }
  let c = 0;
  const walk = dir => {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else if (f.endsWith('.json') && !f.includes('invalid') && f !== 'index.json') c++;
    });
  };
  walk(dp);
  console.log(d + ': ' + c);
});