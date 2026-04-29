/**
 * 继续生成更多Akari谜题（唯一解）
 */

const fs = require('fs');
const path = require('path');

// 复用之前的生成器和求解器代码
function solveAkari(grid, maxSolutions = 2) {
  const size = grid.length;
  const solutions = [];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  function canPlace(board, row, col) {
    if (grid[row][col] !== '.') return false;
    for (let j = 0; j < size; j++) {
      if (j !== col && board[row][j] === 'L') {
        let blocked = false;
        for (let k = Math.min(j, col) + 1; k < Math.max(j, col); k++) {
          if (grid[row][k] !== '.') { blocked = true; break; }
        }
        if (!blocked) return false;
      }
    }
    for (let i = 0; i < size; i++) {
      if (i !== row && board[i][col] === 'L') {
        let blocked = false;
        for (let k = Math.min(i, row) + 1; k < Math.max(i, row); k++) {
          if (grid[k][col] !== '.') { blocked = true; break; }
        }
        if (!blocked) return false;
      }
    }
    return true;
  }
  
  function checkNumberConstraints(board) {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c];
        if (cell >= '0' && cell <= '4') {
          const num = parseInt(cell);
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 'L') count++;
          }
          if (count !== num) return false;
        }
      }
    }
    return true;
  }
  
  function checkAllLit(board) {
    const lit = new Set();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 'L') {
          for (let j = c; j >= 0; j--) { if (grid[r][j] !== '.' && j !== c) break; lit.add(`${r},${j}`); }
          for (let j = c; j < size; j++) { if (grid[r][j] !== '.' && j !== c) break; lit.add(`${r},${j}`); }
          for (let i = r; i >= 0; i--) { if (grid[i][c] !== '.' && i !== r) break; lit.add(`${i},${c}`); }
          for (let i = r; i < size; i++) { if (grid[i][c] !== '.' && i !== r) break; lit.add(`${i},${c}`); }
        }
      }
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === '.' && board[r][c] !== 'L' && !lit.has(`${r},${c}`)) return false;
      }
    }
    return true;
  }
  
  function backtrack(board, cells, idx) {
    if (solutions.length >= maxSolutions) return;
    if (idx === cells.length) {
      if (checkNumberConstraints(board) && checkAllLit(board)) solutions.push(board.map(r => [...r]));
      return;
    }
    const [r, c] = cells[idx];
    backtrack(board, cells, idx + 1);
    if (canPlace(board, r, c)) { const nb = board.map(row => [...row]); nb[r][c] = 'L'; backtrack(nb, cells, idx + 1); }
  }
  
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === '.') cells.push([r, c]);
  backtrack(grid.map(r => [...r]), cells, 0);
  return solutions;
}

function generateUniquePuzzle(size, maxAttempts = 50) {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lights = [];
    const grid = Array(size).fill(null).map(() => Array(size).fill('.'));
    
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    
    function canPlaceLight(grid, lights, r, c) {
      for (const [lr, lc] of lights) {
        if (lr === r) { let blocked = false; for (let k = Math.min(lc, c) + 1; k < Math.max(lc, c); k++) if (grid[r][k] !== '.') { blocked = true; break; } if (!blocked) return false; }
        if (lc === c) { let blocked = false; for (let k = Math.min(lr, r) + 1; k < Math.max(lr, r); k++) if (grid[k][c] !== '.') { blocked = true; break; } if (!blocked) return false; }
      }
      return true;
    }
    
    for (const [r, c] of cells) if (grid[r][c] === '.' && canPlaceLight(grid, lights, r, c)) lights.push([r, c]);
    
    for (let i = 0; i < lights.length; i++) {
      for (let j = i + 1; j < lights.length; j++) {
        const [r1, c1] = lights[i], [r2, c2] = lights[j];
        if (r1 === r2) { const midC = Math.floor((c1 + c2) / 2); if (grid[r1][midC] === '.') grid[r1][midC] = '#'; }
        if (c1 === c2) { const midR = Math.floor((r1 + r2) / 2); if (grid[midR][c1] === '.') grid[midR][c1] = '#'; }
      }
    }
    
    for (const [lr, lc] of lights) {
      for (const [dr, dc] of DIRS) {
        const nr = lr + dr, nc = lc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === '.' && Math.random() < 0.3) {
          let count = 0;
          for (const [dr2, dc2] of DIRS) {
            const nr2 = nr + dr2, nc2 = nc + dc2;
            if (nr2 >= 0 && nr2 < size && nc2 >= 0 && nc2 < size && lights.some(([lr, lc]) => lr === nr2 && lc === nc2)) count++;
          }
          grid[nr][nc] = String(count);
        }
      }
    }
    
    const solutions = solveAkari(grid, 2);
    if (solutions.length === 1) {
      const answer = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (solutions[0][r][c] === 'L') answer.push([r, c]);
      return { size, grid, answer, unique: true };
    }
  }
  return null;
}

// 继续生成
const difficulties = [
  { name: 'easy', size: 5, target: 50 },
  { name: 'medium', size: 7, target: 20 }
];

for (const diff of difficulties) {
  const dir = path.join(__dirname, diff.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const existing = fs.readdirSync(dir).filter(f => f.endsWith('.json')).length;
  const needed = diff.target - existing;
  
  if (needed <= 0) {
    console.log(`${diff.name}: 已有 ${existing} 题，跳过`);
    continue;
  }
  
  console.log(`\n${diff.name}: 现有 ${existing} 题，继续生成 ${needed} 题...`);
  
  let success = 0;
  for (let i = 0; i < needed * 2 && success < needed; i++) {
    const puzzle = generateUniquePuzzle(diff.size, 30);
    if (puzzle) {
      const num = existing + success + 1;
      const filename = `${diff.name}-${String(num).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(puzzle, null, 2));
      success++;
      if (success % 5 === 0) console.log(`  ${success}/${needed}`);
    }
  }
  console.log(`  完成: ${success}/${needed}`);
}

console.log('\n=== 完成 ===');