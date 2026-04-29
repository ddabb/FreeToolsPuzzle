/**
 * 验证生成的谜题是否有唯一解
 */

const fs = require('fs');
const path = require('path');

console.log('=== 验证生成谜题的唯一性 ===\n');

// 求解器
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
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (board[nr][nc] === 'L') count++;
            }
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
          for (let j = c; j >= 0; j--) {
            if (grid[r][j] !== '.' && j !== c) break;
            lit.add(`${r},${j}`);
          }
          for (let j = c; j < size; j++) {
            if (grid[r][j] !== '.' && j !== c) break;
            lit.add(`${r},${j}`);
          }
          for (let i = r; i >= 0; i--) {
            if (grid[i][c] !== '.' && i !== r) break;
            lit.add(`${i},${c}`);
          }
          for (let i = r; i < size; i++) {
            if (grid[i][c] !== '.' && i !== r) break;
            lit.add(`${i},${c}`);
          }
        }
      }
    }
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === '.' && board[r][c] !== 'L' && !lit.has(`${r},${c}`)) {
          return false;
        }
      }
    }
    return true;
  }
  
  function backtrack(board, cells, idx) {
    if (solutions.length >= maxSolutions) return;
    
    if (idx === cells.length) {
      if (checkNumberConstraints(board) && checkAllLit(board)) {
        solutions.push(board.map(r => [...r]));
      }
      return;
    }
    
    const [r, c] = cells[idx];
    
    backtrack(board, cells, idx + 1);
    
    if (canPlace(board, r, c)) {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = 'L';
      backtrack(newBoard, cells, idx + 1);
    }
  }
  
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '.') cells.push([r, c]);
    }
  }
  
  backtrack(grid.map(r => [...r]), cells, 0);
  return solutions;
}

// 验证所有生成的谜题
const difficulties = ['easy', 'medium'];
let totalValid = 0;
let totalInvalid = 0;

for (const diff of difficulties) {
  const dir = path.join(__dirname, diff);
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log(`\n--- ${diff} (${files.length}题) ---`);
  
  for (const file of files) {
    const filepath = path.join(dir, file);
    const puzzle = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    const solutions = solveAkari(puzzle.grid, 2);
    
    if (solutions.length === 1) {
      // 检查答案是否匹配
      const expectedLights = puzzle.answer.map(([r, c]) => `${r},${c}`).sort().join(',');
      const actualLights = [];
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (solutions[0][r][c] === 'L') actualLights.push(`${r},${c}`);
        }
      }
      const actualLightsStr = actualLights.sort().join(',');
      
      if (expectedLights === actualLightsStr) {
        console.log(`  ${file}: ✅ 唯一解，答案匹配`);
        totalValid++;
      } else {
        console.log(`  ${file}: ⚠️ 唯一解，但答案不匹配！`);
        console.log(`    预期: ${expectedLights}`);
        console.log(`    实际: ${actualLightsStr}`);
        totalInvalid++;
      }
    } else if (solutions.length === 0) {
      console.log(`  ${file}: ❌ 无解`);
      totalInvalid++;
    } else {
      console.log(`  ${file}: ❌ 多解 (${solutions.length}个)`);
      totalInvalid++;
    }
  }
}

console.log(`\n=== 总结 ===`);
console.log(`有效谜题: ${totalValid}`);
console.log(`无效谜题: ${totalInvalid}`);
console.log(`成功率: ${totalValid}/${totalValid + totalInvalid} = ${(totalValid / (totalValid + totalInvalid) * 100).toFixed(1)}%`);