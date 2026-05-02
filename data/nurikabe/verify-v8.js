const fs = require('fs');
const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

for (const diff of ['easy', 'medium', 'hard']) {
  const d = JSON.parse(fs.readFileSync(`${DIR}/${diff}-0001.json`, 'utf8'));
  const grid = d.solution;
  const size = d.size;
  
  // Get white components from solution
  const visited = Array.from({length: size}, () => Array(size).fill(false));
  const rooms = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c] || grid[r][c] === 1) continue;
      const cells = [];
      const queue = [[r, c]];
      visited[r][c] = true;
      while (queue.length) {
        const [cr, cc] = queue.shift();
        cells.push([cr, cc]);
        for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc] && grid[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
      rooms.push(cells.length);
    }
  }
  
  console.log(`${diff}: size=${size}, rooms=${rooms.length}, sizes=${rooms.sort((a,b)=>b-a).join(',')}`);
  console.log('  puzzle grid:');
  for (let r = 0; r < size; r++) {
    let s = '';
    for (let c = 0; c < size; c++) {
      s += d.grid[r][c] > 0 ? d.grid[r][c].toString().padStart(2) : ' ·';
    }
    console.log('  ' + s);
  }
  console.log('  solution (B=black):');
  for (let r = 0; r < size; r++) {
    let s = '';
    for (let c = 0; c < size; c++) {
      s += grid[r][c] === 1 ? '██' : '· ';
    }
    console.log('  ' + s);
  }
}
