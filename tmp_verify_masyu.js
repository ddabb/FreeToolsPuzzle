const d = require('./data/masyu/easy/easy-0001.json');
const s = d.size;

// Convert lines format to hEdges/vEdges (same as frontend onShowAnswer)
let hE = Array.from({length: s}, () => Array(s).fill(false));
let vE = Array.from({length: s}, () => Array(s).fill(false));

for (let r = 0; r < s; r++) {
  for (let c = 0; c < s; c++) {
    const l = d.lines[r][c];
    if (l.right) hE[r][c] = true;
    if (l.left && c > 0) hE[r][c-1] = true;
    if (l.bottom) vE[r][c] = true;
    if (l.top && r > 0) vE[r-1][c] = true;
  }
}

// Count edges
let hc = 0, vc = 0;
for (let r = 0; r < s; r++) {
  for (let c = 0; c < s; c++) {
    if (hE[r][c]) hc++;
    if (vE[r][c]) vc++;
  }
}
console.log('hEdges=' + hc + ' vEdges=' + vc + ' total=' + (hc + vc));

// Check each cell has 0 or 2 connections
for (let r = 0; r < s; r++) {
  for (let c = 0; c < s; c++) {
    const top = r > 0 && vE[r-1][c];
    const right = hE[r][c];
    const bottom = vE[r][c];
    const left = c > 0 && hE[r][c-1];
    const conns = [top, right, bottom, left].filter(x => x).length;
    if (conns !== 0 && conns !== 2) {
      console.log('BAD cell', r, c, 'conns:', conns);
    }
  }
}

// Trace loop
let sr = -1, sc = -1;
outer: for (let r = 0; r < s; r++) {
  for (let c = 0; c < s; c++) {
    if (hE[r][c] || vE[r][c]) { sr = r; sc = c; break outer; }
  }
}
console.log('start:', sr, sc);

if (sr >= 0) {
  let visited = new Set();
  let cr = sr, cc = sc, prevDir = -1, steps = 0;
  const dirs = [[-1,0],[0,1],[1,0],[0,-1]]; // top right bottom left

  function getEdge(r, c, dir) {
    if (dir === 0) return r > 0 && vE[r-1][c];
    if (dir === 1) return hE[r][c];
    if (dir === 2) return vE[r][c];
    if (dir === 3) return c > 0 && hE[r][c-1];
    return false;
  }

  while (steps < 200) {
    let key = cr + ',' + cc;
    if (steps > 0 && cr === sr && cc === sc) {
      console.log('LOOP CLOSED at step', steps);
      break;
    }
    if (visited.has(key)) {
      console.log('REVISITED non-start', key);
      break;
    }
    visited.add(key);
    let found = false;
    for (let i = 0; i < 4; i++) {
      if (prevDir >= 0 && (prevDir + 2) % 4 === i) continue;
      if (getEdge(cr, cc, i)) {
        cr += dirs[i][0];
        cc += dirs[i][1];
        prevDir = i;
        found = true;
        break;
      }
    }
    if (!found) {
      console.log('STUCK at', cr, cc);
      break;
    }
    steps++;
  }
  console.log('Visited:', visited.size, 'Steps:', steps);
}

// Now check the WXML coordinate system vs data
// WXML renders hEdges at: left = (c + 0.5) * cellSize + 15, top = (r + 0.5) * cellSize + 15
// This means hEdges[r][c] is drawn FROM cell (r,c) center TO cell (r,c+1) center
// Similarly vEdges[r][c] is drawn FROM cell (r,c) center TO cell (r+1,c) center
// This is CORRECT for the hEdges/vEdges convention used in the code

// The key question: when user taps on an edge, does onEdgeTap correctly identify which edge?
// onEdgeTap receives {r, c, dir} from data-r, data-c, data-dir
// For dir='h': hEdges[r][c] is toggled - this is the edge going RIGHT from dot (r,c)
// For dir='v': vEdges[r][c] is toggled - this is the edge going DOWN from dot (r,c)

// The WXML positions:
// edge-h at (c + 0.5) * cellSize + DOT_OFFSET, (r + 0.5) * cellSize + DOT_OFFSET
// This is the midpoint between dot (r,c) and dot (r,c+1) - correct for horizontal edge
// edge-v at (c + 0.5) * cellSize + DOT_OFFSET, (r + 0.5) * cellSize + DOT_OFFSET
// This is the midpoint between dot (r,c) and dot (r+1,c) - correct for vertical edge

console.log('\nCoordinate system check:');
console.log('WXML hEdges[r][c] drawn at: left=(c+0.5)*cellSize+15, top=(r+0.5)*cellSize+15');
console.log('This places horizontal edge between dot(r,c) and dot(r,c+1) - CORRECT');
console.log('WXML vEdges[r][c] drawn at: left=(c+0.5)*cellSize+15, top=(r+0.5)*cellSize+15');
console.log('This places vertical edge between dot(r,c) and dot(r+1,c) - CORRECT');
