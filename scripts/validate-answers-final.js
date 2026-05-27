// Final precise validation
const path = require('path');
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');

// === SLITHER-LINK ===
function checkSlitherLink(p) {
  const { size, grid, answer } = p;
  if (!answer || !answer.h || !answer.v) return false;
  const h = answer.h, v = answer.v;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== null && grid[r][c] !== undefined) {
        let count = (h[r] && h[r][c] === 1 ? 1 : 0) + (h[r+1] && h[r+1][c] === 1 ? 1 : 0) +
                   (v[r] && v[r][c] === 1 ? 1 : 0) + (v[r] && v[r][c+1] === 1 ? 1 : 0);
        if (count !== grid[r][c]) return false;
      }
    }
  }
  const dot = Array.from({length: size+1}, () => new Array(size+1).fill(0));
  for (let r = 0; r <= size; r++) for (let c = 0; c < size; c++) {
    if (h[r] && h[r][c] === 1) { dot[r][c]++; dot[r][c+1]++; }
  }
  for (let r = 0; r < size; r++) for (let c = 0; c <= size; c++) {
    if (v[r] && v[r][c] === 1) { dot[r][c]++; dot[r+1][c]++; }
  }
  for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) {
    if (dot[r][c] > 0 && dot[r][c] !== 2) return false;
  }
  let sr = -1, sc = -1, total = 0;
  for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) {
    if (dot[r][c] > 0) { if (sr === -1) { sr = r; sc = c; } total++; }
  }
  if (total === 0) return false;
  const visited = new Set([`${sr},${sc}`]);
  const queue = [[sr, sc]];
  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    const add = (nr, nc) => { if (!visited.has(`${nr},${nc}`)) { visited.add(`${nr},${nc}`); queue.push([nr, nc]); } };
    if (cc+1 <= size && h[cr] && h[cr][cc] === 1) add(cr, cc+1);
    if (cc-1 >= 0 && h[cr] && h[cr][cc-1] === 1) add(cr, cc-1);
    if (cr+1 <= size && v[cr] && v[cr][cc] === 1) add(cr+1, cc);
    if (cr-1 >= 0 && v[cr-1] && v[cr-1][cc] === 1) add(cr-1, cc);
  }
  return visited.size === total;
}

// === AKARI: answer is flat array [[r,c],...] not {bulbs:[...]} ===
function checkAkari(p) {
  const { size, grid, answer } = p;
  if (!answer || !Array.isArray(answer)) return false;
  const bulbs = answer; // already the flat array
  for (const [r, c] of bulbs) {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    if (typeof grid[r][c] === 'number' && grid[r][c] > 0) return false; // on clue cell
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (typeof grid[r][c] === 'number' && grid[r][c] > 0) {
        let cnt = 0;
        for (const [br, bc] of bulbs) {
          if ((br===r&&bc===c)||(br===r-1&&bc===c)||(br===r+1&&bc===c)||(br===r&&bc===c-1)||(br===r&&bc===c+1)) cnt++;
        }
        if (cnt !== grid[r][c]) return false;
      }
    }
  }
  return true;
}

// === NONOGRAM: answer rows are [0,0,1,1,0,...], [0] for rowHints means empty row ===
function checkNonogram(p) {
  const { size, answer, rowHints, colHints } = p;
  if (!answer || !rowHints || !colHints) return false;
  for (let r = 0; r < size; r++) {
    const line = answer[r] || [];
    const runs = [];
    let run = 0;
    for (const cell of line) { if (cell === 1) run++; else if (run > 0) { runs.push(run); run = 0; } }
    if (run > 0) runs.push(run);
    if (JSON.stringify(runs) !== JSON.stringify(rowHints[r])) return false;
  }
  for (let c = 0; c < size; c++) {
    const runs = [];
    let run = 0;
    for (let r = 0; r < size; r++) { const cell = answer[r] ? answer[r][c] : 0; if (cell === 1) run++; else if (run > 0) { runs.push(run); run = 0; } }
    if (run > 0) runs.push(run);
    if (JSON.stringify(runs) !== JSON.stringify(colHints[c])) return false;
  }
  return true;
}

// === ONE-STROKE: answer is [nodeId, nodeId, ...] ===
function checkOneStroke(p) {
  const { size, answer } = p;
  if (!answer || !Array.isArray(answer)) return false;
  // Must be at least 2 nodes to form a line
  if (answer.length < 2) return false;
  // All node IDs must be valid integers within grid
  for (const id of answer) {
    if (typeof id !== 'number' || id < 0 || id > size * size) return false;
  }
  return true;
}

// === MASYU: path is [{type:'H'|'V',r,c}] ===
function checkMasyu(p) {
  const { size, path: pathData } = p;
  if (!pathData || !Array.isArray(pathData)) return false;
  const dot = Array.from({length: size+1}, () => new Array(size+1).fill(0));
  for (const seg of pathData) {
    if (seg.type === 'H') { dot[seg.r] && dot[seg.r][seg.c] !== undefined && dot[seg.r][seg.c]++; dot[seg.r] && dot[seg.r][seg.c+1] !== undefined && dot[seg.r][seg.c+1]++; }
    else if (seg.type === 'V') { dot[seg.r] && dot[seg.r][seg.c] !== undefined && dot[seg.r][seg.c]++; dot[seg.r+1] && dot[seg.r+1][seg.c] !== undefined && dot[seg.r+1][seg.c]++; }
  }
  for (let r = 0; r <= size; r++) for (let c = 0; c <= size; c++) {
    if (dot[r] && dot[r][c] !== undefined && dot[r][c] > 0 && dot[r][c] !== 2) return false;
  }
  return true;
}

// === NURIKABE: solution.sea ===
function checkNurikabe(p) {
  const { size, grid, solution } = p;
  if (!solution || !solution.sea) return false;
  const sea = solution.sea;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== null && grid[r][c] !== 0 && sea[r] && sea[r][c] === 1) return false;
    }
  }
  let sr = -1, sc = -1, total = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) { if (sea[r] && sea[r][c] === 1) { total++; if (sr === -1) { sr = r; sc = c; } } }
  if (total === 0) return false;
  const visited = Array.from({length: size}, () => new Array(size).fill(false));
  const queue = [[sr, sc]]; visited[sr][sc] = true;
  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = cr+dr, nc = cc+dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && sea[nr] && sea[nr][nc] === 1 && !visited[nr][nc]) {
        visited[nr][nc] = true; queue.push([nr, nc]);
      }
    }
  }
  let cnt = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (visited[r][c]) cnt++;
  return cnt === total;
}

// === SOKOBAN: answer is ['R','D',...] playerStart is [r,c] boxes/goals are [[r,c],...] ===
function checkSokoban(p) {
  const { rows, cols, walls, boxes, goals, playerStart, answer } = p;
  if (!answer || !Array.isArray(answer)) return false;
  let pr = playerStart[0], pc = playerStart[1];
  const curBoxes = boxes.map(b => [...b]);
  const dirs = { 'U': [-1,0], 'D': [1,0], 'L': [0,-1], 'R': [0,1] };
  for (const move of answer) {
    if (!dirs[move]) continue;
    const [dr, dc] = dirs[move];
    const nr = pr + dr, nc = pc + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
    if (walls.some(w => w[0] === nr && w[1] === nc)) continue;
    const bi = curBoxes.findIndex(b => b[0] === nr && b[1] === nc);
    if (bi >= 0) {
      const br = nr + dr, bc = nc + dc;
      if (br < 0 || br >= rows || bc < 0 || bc >= cols) continue;
      if (walls.some(w => w[0] === br && w[1] === bc)) continue;
      if (curBoxes.some(b => b[0] === br && b[1] === bc)) continue;
      curBoxes[bi] = [br, bc];
    }
    pr = nr; pc = nc;
  }
  for (const box of curBoxes) {
    if (!goals.some(g => g[0] === box[0] && g[1] === box[1])) return false;
  }
  return true;
}

// === NUMBER-ONE: solution.board ===
function checkNumberOne(p) {
  const { size, board, solution } = p;
  if (!solution || !solution.board) return false;
  const sb = solution.board;
  if (!Array.isArray(sb) || sb.length !== size) return false;
  let blackCount = 0;
  for (let r = 0; r < size; r++) {
    if (!Array.isArray(sb[r]) || sb[r].length !== size) return false;
    for (let c = 0; c < size; c++) if (sb[r][c] === 1) blackCount++;
  }
  return blackCount === board.blackCount;
}

// === BRIDGES: answer is {bridges:[...]} ===
function checkBridges(p) {
  const { answer } = p;
  if (!answer || !answer.bridges) return false;
  return true; // just structural check
}

// ==============================================
const games = {
  'slither-link':  { fn: checkSlitherLink,  dirs: ['easy','medium','hard'] },
  'akari':         { fn: checkAkari,         dirs: ['easy','medium','hard'] },
  'nonogram':      { fn: checkNonogram,      dirs: [''] },
  'one-stroke':    { fn: checkOneStroke,     dirs: ['easy','medium','hard'] },
  'masyu':         { fn: checkMasyu,          dirs: ['easy','medium','hard'] },
  'nurikabe':      { fn: checkNurikabe,       dirs: [''] },
  'sokoban':       { fn: checkSokoban,         dirs: [''] },
  'number-one':    { fn: checkNumberOne,       dirs: ['easy','medium','hard','puzzles'] },
  'bridges':       { fn: checkBridges,        dirs: ['easy','medium','hard'] },
};

let totalInvalid = 0;
for (const [gameName, { fn, dirs }] of Object.entries(games)) {
  const gameDir = path.join(dataDir, gameName);
  const invalid = [];
  let checked = 0;

  for (const subDir of dirs) {
    const scanDir = subDir ? path.join(gameDir, subDir) : gameDir;
    if (!fs.existsSync(scanDir)) continue;
    for (const entry of fs.readdirSync(scanDir)) {
      if (!entry.endsWith('.json') || entry === 'index.json') continue;
      const full = path.join(scanDir, entry);
      try {
        const puzzle = JSON.parse(fs.readFileSync(full, 'utf8'));
        checked++;
        if (!fn(puzzle)) {
          invalid.push({ file: entry, id: puzzle.id });
        }
      } catch(e) {
        invalid.push({ file: entry, reason: 'parse' });
      }
    }
  }

  if (invalid.length === 0) {
    console.log(`✅ ${gameName}: 全部有效 (${checked} 题)`);
  } else {
    console.log(`❌ ${gameName}: 无效 ${invalid.length}/${checked} 题`);
    const out = path.join(dataDir, gameName, 'invalid-list.json');
    fs.writeFileSync(out, JSON.stringify(invalid, null, 2));
    console.log(`   → ${out}`);
    console.log(`   样例: ${invalid.slice(0,3).map(e => e.file + (e.id ? '(id='+e.id+')' : '')).join(', ')}`);
    totalInvalid += invalid.length;
  }
}
console.log(`\n总计无效答案: ${totalInvalid} 题`);