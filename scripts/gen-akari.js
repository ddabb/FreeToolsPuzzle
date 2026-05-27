/**
 * Akari Puzzle Generator
 * 生成有解的 Akari 题目（grid + answer）
 * 策略：先随机放置灯泡 → 计算照亮范围 → 生成grid（空白格变黑格）
 */
const fs = require('fs');
const path = require('path');

const dirs = [[0,1],[0,-1],[1,0],[-1,0]];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateAkariPuzzle(size) {
  const MAX_ATTEMPTS = 50;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 1. Create empty grid (all white)
    const grid = Array.from({length:size}, ()=>Array(size).fill(0));
    const bulbs = Array.from({length:size}, ()=>Array(size).fill(false));
    const lit = Array.from({length:size}, ()=>Array(size).fill(false));

    function markLit(r, c) {
      lit[r][c] = true;
      for (const [dr,dc] of dirs) {
        let nr=r+dr, nc=c+dc;
        while (nr>=0 && nr<size && nc>=0 && nc<size && grid[nr][nc] < 2) { lit[nr][nc]=true; nr+=dr; nc+=dc; }
      }
    }

    function isPartialValid() {
      for (let r=0; r<size; r++) for (let c=0; c<size; c++) {
        if (grid[r][c] >= 2) {
          const req = grid[r][c] - 2;
          let cnt = 0;
          if (r>0 && bulbs[r-1][c]) cnt++;
          if (r<size-1 && bulbs[r+1][c]) cnt++;
          if (c>0 && bulbs[r][c-1]) cnt++;
          if (c<size-1 && bulbs[r][c+1]) cnt++;
          if (cnt > req) return false;
        }
      }
      for (let r=0; r<size; r++) for (let c=0; c<size; c++) {
        if (!bulbs[r][c]) continue;
        for (const [dr,dc] of dirs) {
          let nr=r+dr, nc=c+dc;
          while (nr>=0 && nr<size && nc>=0 && nc<size && grid[nr][nc] < 2) {
            if (bulbs[nr][nc]) return false;
            nr+=dr; nc+=dc;
          }
        }
      }
      return true;
    }

    // 2. Place black cells randomly
    const blackCount = Math.floor(size * size * 0.15 + Math.random() * size * 0.1); // 15-25% black
    let blacksPlaced = 0;
    const blackPositions = [];
    
    // Don't place on edges to keep puzzle interesting
    for (let i = 0; i < blackCount * 3 && blacksPlaced < blackCount; i++) {
      const r = randInt(1, size-2);
      const c = randInt(1, size-2);
      if (grid[r][c] === 0) {
        grid[r][c] = 2; // black-0 (no number)
        blackPositions.push([r, c]);
        blacksPlaced++;
      }
    }

    // 3. Solve with backtracking to place bulbs
    function backtrack(idx) {
      if (idx >= size * size) {
        for (let r=0; r<size; r++) for (let c=0; c<size; c++)
          if (grid[r][c] < 2 && !lit[r][c]) return false;
        return true;
      }
      const r = Math.floor(idx / size), c = idx % size;
      if (grid[r][c] >= 2) return backtrack(idx + 1);
      if (backtrack(idx + 1)) return true;
      bulbs[r][c] = true;
      const prevLit = lit.map(row => [...row]);
      markLit(r, c);
      if (isPartialValid() && backtrack(idx + 1)) return true;
      bulbs[r][c] = false;
      for (let i=0; i<size; i++) for (let j=0; j<size; j++) lit[i][j] = prevLit[i][j];
      return false;
    }

    // Reset and solve
    for (let r=0; r<size; r++) for (let c=0; c<size; c++) { lit[r][c]=false; bulbs[r][c]=false; }
    
    if (!backtrack(0)) continue; // No solution, retry

    // 4. Assign numbers to black cells based on adjacent bulbs
    for (const [r,c] of blackPositions) {
      let cnt = 0;
      if (r>0 && bulbs[r-1][c]) cnt++;
      if (r<size-1 && bulbs[r+1][c]) cnt++;
      if (c>0 && bulbs[r][c-1]) cnt++;
      if (c<size-1 && bulbs[r][c+1]) cnt++;
      grid[r][c] = cnt + 2; // 2=num0, 3=num1, ..., 6=num4
    }

    // 5. Verify solution still works with numbers
    // Re-verify
    let valid = true;
    for (let r=0; r<size; r++) for (let c=0; c<size; c++) {
      if (grid[r][c] >= 2) {
        const req = grid[r][c] - 2;
        let cnt = 0;
        if (r>0 && bulbs[r-1][c]) cnt++;
        if (r<size-1 && bulbs[r+1][c]) cnt++;
        if (c>0 && bulbs[r][c-1]) cnt++;
        if (c<size-1 && bulbs[r][c+1]) cnt++;
        if (cnt !== req) { valid = false; break; }
      }
    }
    if (!valid) continue;

    // 6. Collect answer
    const answer = [];
    for (let r=0; r<size; r++) for (let c=0; c<size; c++) if (bulbs[r][c]) answer.push([r, c]);

    return { grid, answer, size, maxLights: answer.length };
  }
  
  return null; // Failed all attempts
}

// Verify
function verify(data) {
  const g=data.grid, a=data.answer, s=data.size;
  const bulbs = Array.from({length:s}, ()=>Array(s).fill(false));
  for (const [r,c] of a) bulbs[r][c]=true;
  for (const [br,bc] of a) for (const [dr,dc] of dirs) {
    let nr=br+dr,nc=bc+dc;
    while(nr>=0&&nr<s&&nc>=0&&nc<s&&g[nr][nc]<2){if(bulbs[nr][nc])return false;nr+=dr;nc+=dc;}
  }
  const lit = Array.from({length:s}, ()=>Array(s).fill(false));
  for (const [br,bc] of a) { lit[br][bc]=true; for(const[dr,dc]of dirs){let nr=br+dr,nc=bc+dc;while(nr>=0&&nr<s&&nc>=0&&nc<s&&g[nr][nc]<2){lit[nr][nc]=true;nr+=dr;nc+=dc;}} }
  for(let r=0;r<s;r++)for(let c=0;c<s;c++){
    if(g[r][c]>=2){const req=g[r][c]-2;let cnt=0;if(r>0&&bulbs[r-1][c])cnt++;if(r<s-1&&bulbs[r+1][c])cnt++;if(c>0&&bulbs[r][c-1])cnt++;if(c<s-1&&bulbs[r][c+1])cnt++;if(cnt!==req)return false;}
    if(g[r][c]<2&&!lit[r][c])return false;
  }
  return true;
}

// --- Main: replace NO SOLUTION puzzles ---
const diff = process.argv[2] || 'medium';
const dataDir = path.join('F:/SelfJob/FreeToolsPuzzle/data/akari', diff);
const sizeMap = { easy: 7, medium: 10, hard: 12 };
const targetSize = sizeMap[diff] || 10;

if (!fs.existsSync(dataDir)) { console.log(`${diff}: not found`); process.exit(1); }
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json').sort();

let regenerated = 0;
for (const f of files) {
  const fp = path.join(dataDir, f);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (data.size !== targetSize || !verify(data)) {
    const puzzle = generateAkariPuzzle(targetSize);
    if (puzzle && verify(puzzle)) {
      puzzle.id = f.replace('.json', '');
      puzzle.difficulty = diff;
      fs.writeFileSync(fp, JSON.stringify(puzzle));
      regenerated++;
      if (regenerated <= 10) console.log(`${f}: regenerated`);
    } else {
      console.log(`${f}: FAILED to generate`);
    }
  }
}
console.log(`\n${diff}: ${regenerated} puzzles regenerated`);
