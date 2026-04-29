/**
 * Akari谜题生成器 - 唯一解版本
 * 
 * 策略：
 * 1. 先生成灯塔布局（解）
 * 2. 添加墙和数字约束，逐步缩小解空间
 * 3. 验证唯一性（找到第2个解就继续添加约束）
 */

const fs = require('fs');
const path = require('path');

console.log('=== Akari谜题生成器（唯一解版本） ===\n');

// 求解器：找所有解（最多maxSolutions个）
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

// 生成一个有唯一解的谜题
function generateUniquePuzzle(size, maxAttempts = 100) {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 步骤1: 随机生成灯塔布局
    const lights = [];
    const grid = Array(size).fill(null).map(() => Array(size).fill('.'));
    
    // 随机放置灯塔（确保不互相照射）
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    
    // 随机打乱
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    
    // 尝试放置灯塔
    function canPlaceLight(grid, lights, r, c) {
      for (const [lr, lc] of lights) {
        if (lr === r) {
          // 同行，检查是否有墙阻挡
          let blocked = false;
          for (let k = Math.min(lc, c) + 1; k < Math.max(lc, c); k++) {
            if (grid[r][k] !== '.') { blocked = true; break; }
          }
          if (!blocked) return false;
        }
        if (lc === c) {
          // 同列，检查是否有墙阻挡
          let blocked = false;
          for (let k = Math.min(lr, r) + 1; k < Math.max(lr, r); k++) {
            if (grid[k][c] !== '.') { blocked = true; break; }
          }
          if (!blocked) return false;
        }
      }
      return true;
    }
    
    // 放置灯塔，直到照亮所有格子
    for (const [r, c] of cells) {
      if (grid[r][c] === '.' && canPlaceLight(grid, lights, r, c)) {
        lights.push([r, c]);
      }
    }
    
    // 检查是否照亮所有格子
    const lit = new Set();
    for (const [r, c] of lights) {
      for (let j = 0; j < size; j++) {
        let blocked = false;
        for (let k = Math.min(j, c); k <= Math.max(j, c); k++) {
          if (grid[r][k] !== '.' && k !== c && k !== j) { blocked = true; break; }
        }
        if (!blocked) lit.add(`${r},${j}`);
      }
      for (let i = 0; i < size; i++) {
        let blocked = false;
        for (let k = Math.min(i, r); k <= Math.max(i, r); k++) {
          if (grid[k][c] !== '.' && k !== r && k !== i) { blocked = true; break; }
        }
        if (!blocked) lit.add(`${i},${c}`);
      }
    }
    
    // 步骤2: 添加墙和数字约束
    // 在灯塔之间添加墙来分隔
    for (let i = 0; i < lights.length; i++) {
      for (let j = i + 1; j < lights.length; j++) {
        const [r1, c1] = lights[i];
        const [r2, c2] = lights[j];
        
        if (r1 === r2) {
          // 同行，中间加墙
          const midC = Math.floor((c1 + c2) / 2);
          if (grid[r1][midC] === '.') {
            grid[r1][midC] = '#';
          }
        }
        if (c1 === c2) {
          // 同列，中间加墙
          const midR = Math.floor((r1 + r2) / 2);
          if (grid[midR][c1] === '.') {
            grid[midR][c1] = '#';
          }
        }
      }
    }
    
    // 步骤3: 添加数字约束（在灯塔周围）
    for (const [lr, lc] of lights) {
      // 随机在灯塔周围添加数字墙
      for (const [dr, dc] of DIRS) {
        const nr = lr + dr, nc = lc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === '.') {
          if (Math.random() < 0.3) { // 30%概率添加数字墙
            // 计算周围灯塔数量
            let count = 0;
            for (const [dr2, dc2] of DIRS) {
              const nr2 = nr + dr2, nc2 = nc + dc2;
              if (nr2 >= 0 && nr2 < size && nc2 >= 0 && nc2 < size) {
                if (lights.some(([lr, lc]) => lr === nr2 && lc === nc2)) count++;
              }
            }
            grid[nr][nc] = String(count);
          }
        }
      }
    }
    
    // 步骤4: 验证唯一性
    const solutions = solveAkari(grid, 2);
    
    if (solutions.length === 1) {
      // 提取答案
      const answer = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (solutions[0][r][c] === 'L') answer.push([r, c]);
        }
      }
      
      return {
        size,
        grid,
        answer,
        unique: true
      };
    }
  }
  
  return null; // 生成失败
}

// 生成题库
const difficulties = [
  { name: 'easy', size: 5, count: 10 },
  { name: 'medium', size: 7, count: 5 },
  { name: 'hard', size: 10, count: 3 }
];

for (const diff of difficulties) {
  console.log(`\n生成 ${diff.name} 难度 (${diff.size}x${diff.size})...`);
  
  const dir = path.join(__dirname, diff.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let success = 0;
  for (let i = 0; i < diff.count; i++) {
    console.log(`  生成第 ${i + 1}/${diff.count} 题...`);
    const puzzle = generateUniquePuzzle(diff.size, 50);
    
    if (puzzle) {
      const filename = `${diff.name}-${String(i + 1).padStart(4, '0')}.json`;
      const filepath = path.join(dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(puzzle, null, 2));
      success++;
      console.log(`    ✓ 成功`);
    } else {
      console.log(`    ✗ 失败`);
    }
  }
  
  console.log(`  成功率: ${success}/${diff.count}`);
}

console.log('\n=== 完成 ===');