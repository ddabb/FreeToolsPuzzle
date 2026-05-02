// Analyze existing valid hard nurikabe puzzles to understand patterns
const fs = require('fs');
const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

function neighbors(r, c, size) {
  const n = [];
  if (r > 0) n.push([r-1, c]);
  if (r < size-1) n.push([r+1, c]);
  if (c > 0) n.push([r, c-1]);
  if (c < size-1) n.push([r, c+1]);
  return n;
}

function getAllWhiteComponents(grid, size) {
  const visited = Array.from({length: size}, () => Array(size).fill(false));
  const components = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (visited[r][c] || grid[r][c] === 1) continue;
      const cells = [];
      const queue = [[r, c]];
      visited[r][c] = true;
      while (queue.length) {
        const [cr, cc] = queue.shift();
        cells.push([cr, cc]);
        for (const [nr, nc] of neighbors(cr, cc, size)) {
          if (!visited[nr][nc] && grid[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
      components.push(cells);
    }
  }
  return components;
}

// Read the first 5 hard puzzles
for (let i = 1; i <= 5; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const { size, solution } = d;
  
  const rooms = getAllWhiteComponents(solution, size);
  const blackCount = solution.flat().filter(v => v === 1).length;
  
  // Compute black adjacency: for each black cell, how many black neighbors?
  let blackAdj1 = 0, blackAdj2 = 0, blackAdj3 = 0, blackAdj4 = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (solution[r][c] !== 1) continue;
      const adj = neighbors(r, c, size).filter(([nr,nc]) => solution[nr][nc] === 1).length;
      if (adj === 1) blackAdj1++;
      else if (adj === 2) blackAdj2++;
      else if (adj === 3) blackAdj3++;
      else if (adj === 4) blackAdj4++;
    }
  }
  
  const roomSizes = rooms.map(r => r.length).sort((a,b) => b-a);
  console.log(`hard-${id}: ${rooms.length} rooms, sizes=[${roomSizes}], black=${blackCount}/${size*size}(${(blackCount/(size*size)*100).toFixed(0)}%), adj:1=${blackAdj1} 2=${blackAdj2} 3=${blackAdj3} 4=${blackAdj4}`);
  
  // Show solution
  for (let r = 0; r < size; r++) {
    let s = '';
    for (let c = 0; c < size; c++) {
      s += solution[r][c] === 1 ? '██' : '· ';
    }
    console.log('  ' + s);
  }
  console.log();
}
