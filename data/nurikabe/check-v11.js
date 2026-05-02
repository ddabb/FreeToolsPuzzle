const fs = require('fs');
const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

for (const diff of ['easy', 'medium', 'hard']) {
  const fname = `${DIR}/${diff}-0001.json`;
  try {
    const d = JSON.parse(fs.readFileSync(fname, 'utf8'));
    const grid = d.solution;
    const size = d.size;
    
    const visited = Array.from({length: size}, () => Array(size).fill(false));
    const rooms = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (visited[r][c] || grid[r][c] === 1) continue;
        const cells = [];
        const q = [[r, c]];
        visited[r][c] = true;
        while (q.length) {
          const [cr, cc] = q.shift();
          cells.push([cr, cc]);
          for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
            const nr = cr+dr, nc = cc+dc;
            if (nr>=0 && nr<size && nc>=0 && nc<size && !visited[nr][nc] && grid[nr][nc]===0) {
              visited[nr][nc] = true;
              q.push([nr, nc]);
            }
          }
        }
        rooms.push(cells.length);
      }
    }
    console.log(`${diff}: rooms=${rooms.length} sizes=${rooms.sort((a,b)=>b-a).join(',')}`);
    console.log('  puzzle:');
    for (let r = 0; r < size; r++) {
      let s = '';
      for (let c = 0; c < size; c++) {
        s += d.grid[r][c] > 0 ? String(d.grid[r][c]).padStart(3) : '  ·';
      }
      console.log('  ' + s);
    }
    console.log('  solution:');
    for (let r = 0; r < size; r++) {
      let s = '';
      for (let c = 0; c < size; c++) {
        s += grid[r][c] === 1 ? '██' : '· ';
      }
      console.log('  ' + s);
    }
    
    // Check file count
    const files = fs.readdirSync(DIR).filter(f => f.startsWith(diff+'-') && f.endsWith('.json'));
    console.log(`  Total files: ${files.length}`);
  } catch(e) {
    console.log(`${diff}: no file or error: ${e.message}`);
  }
}
