const fs = require('fs');
const path = require('path');
const DIR = 'F:/SelfJob/FreeToolsPuzzle/data/nurikabe';

function analyzeRoomSizes(puzzle) {
  const s = puzzle.size, grid = puzzle.grid;
  const visited = Array.from({length: s}, () => Array(s).fill(false));
  const rooms = [];
  for (let r = 0; r < s; r++) for (let c = 0; c < s; c++) {
    if (visited[r][c] || grid[r][c] !== 0) continue;
    let size = 0, queue = [[r, c]];
    visited[r][c] = true;
    while (queue.length) {
      const [cr, cc] = queue.shift();
      size++;
      for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const nr = cr + dr, nc = cc + dc;
        if (nr >= 0 && nr < s && nc >= 0 && nc < s && !visited[nr][nc] && grid[nr][nc] === 0) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }
    rooms.push(size);
  }
  return rooms.sort((a, b) => b - a);
}

for (const diff of ['easy', 'medium', 'hard']) {
  let sumMax = 0, bigRooms = 0, maxRoom = 0, totalRooms = 0;
  const sampleSize = 50;
  for (let i = 1; i <= sampleSize; i++) {
    const id = String(i).padStart(4, '0');
    const fp = path.join(DIR, diff + '-' + id + '.json');
    if (!fs.existsSync(fp)) continue;
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const rooms = analyzeRoomSizes(d);
    sumMax += rooms[0];
    totalRooms += rooms.length;
    if (rooms[0] > 8) bigRooms++;
    if (rooms[0] > maxRoom) maxRoom = rooms[0];
    // Also check for rooms without numbers (invalid nurikabe)
  }
  console.log(`${diff}: avg max room=${(sumMax/sampleSize).toFixed(1)}, rooms>8: ${bigRooms}/${sampleSize}, global max=${maxRoom}`);
}

// Show a specific hard puzzle detail
const sample = JSON.parse(fs.readFileSync(path.join(DIR, 'hard-0001.json'), 'utf8'));
console.log('\nhard-0001 rooms:', analyzeRoomSizes(sample));
console.log('grid:');
for (let r = 0; r < sample.size; r++) {
  let s = '';
  for (let c = 0; c < sample.size; c++) {
    s += sample.grid[r][c] > 0 ? sample.grid[r][c].toString().padStart(2) : ' .';
  }
  console.log(s);
}
