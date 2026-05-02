// Check what max room size actually is in the 52 invalid hard puzzles
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

let maxRoomSeen = 0;
const roomSizeBuckets = {};
const invalidFiles = [];

for (let i = 1; i <= 1000; i++) {
  const id = String(i).padStart(4, '0');
  const fp = `${DIR}/hard-${id}.json`;
  if (!fs.existsSync(fp)) continue;
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const rooms = getAllWhiteComponents(d.solution, d.size);
  const maxR = Math.max(...rooms.map(r => r.length));
  
  if (maxR > maxRoomSeen) maxRoomSeen = maxR;
  roomSizeBuckets[maxR] = (roomSizeBuckets[maxR] || 0) + 1;
  
  if (maxR > 6) {
    invalidFiles.push({ id, maxRoom: maxR, roomSizes: rooms.map(r=>r.length).sort((a,b)=>b-a) });
  }
}

console.log(`Max room size seen: ${maxRoomSeen}`);
console.log(`\nDistribution of max room per puzzle:`);
for (const s of Object.keys(roomSizeBuckets).sort((a,b)=>a-b)) {
  console.log(`  maxRoom=${s}: ${roomSizeBuckets[s]} puzzles`);
}

console.log(`\nInvalid (maxRoom>6): ${invalidFiles.length}`);
console.log(`First 5 invalid:`);
for (const f of invalidFiles.slice(0, 5)) {
  console.log(`  hard-${f.id}: maxRoom=${f.maxRoom}, rooms=[${f.roomSizes.join(',')}]`);
}
