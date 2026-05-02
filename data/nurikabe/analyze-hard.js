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

// Analyze room size distribution for hard
const sizeDist = {};
let totalRooms = 0;
for (let i = 1; i <= 1000; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  if (!fs.existsSync(fp)) continue;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const rooms = getAllWhiteComponents(d.solution, d.size);
  for (const room of rooms) {
    const s = room.length;
    sizeDist[s] = (sizeDist[s] || 0) + 1;
    totalRooms++;
  }
}
console.log(`Hard room size distribution (total ${totalRooms} rooms):`);
for (const s of Object.keys(sizeDist).sort((a,b) => a-b)) {
  console.log(`  size ${s}: ${sizeDist[s]} (${(sizeDist[s]/totalRooms*100).toFixed(1)}%)`);
}

// How many puzzles have rooms > 6?
let over6 = 0;
for (let i = 1; i <= 1000; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  if (!fs.existsSync(fp)) continue;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const rooms = getAllWhiteComponents(d.solution, d.size);
  if (rooms.some(r => r.length > 6)) over6++;
}
console.log(`\nPuzzles with rooms > 6: ${over6}/1000`);

// Same for > 7
let over7 = 0;
for (let i = 1; i <= 1000; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  if (!fs.existsSync(fp)) continue;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const rooms = getAllWhiteComponents(d.solution, d.size);
  if (rooms.some(r => r.length > 7)) over7++;
}
console.log(`Puzzles with rooms > 7: ${over7}/1000`);
