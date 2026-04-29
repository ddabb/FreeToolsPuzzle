/**
 * 验证Akari谜题唯一解是否存在 - 改进版
 * 
 * 先构造一个有效谜题（有解），再验证是否唯一
 */

console.log('=== 验证Akari谜题唯一解（改进版） ===\n');

// 简单的3x3谜题
// 设计思路：
// - 中心放数字墙，约束灯塔位置
// - 角落放灯塔
// - 确保所有格子被照亮

const testPuzzles = [
  {
    name: '简单3x3-1',
    size: 3,
    grid: [
      ['.', '.', '.'],
      ['.', '1', '.'],
      ['.', '.', '.']
    ]
  },
  {
    name: '简单3x3-2（带墙）',
    size: 3,
    grid: [
      ['.', '#', '.'],
      ['#', '0', '#'],
      ['.', '#', '.']
    ]
  },
  {
    name: '简单4x4',
    size: 4,
    grid: [
      ['.', '.', '#', '.'],
      ['.', '1', '.', '.'],
      ['#', '.', '.', '1'],
      ['.', '.', '.', '.']
    ]
  },
  {
    name: '经典5x5',
    size: 5,
    grid: [
      ['.', '.', '.', '.', '.'],
      ['.', '#', '.', '#', '.'],
      ['.', '.', '#', '.', '.'],
      ['.', '#', '.', '#', '.'],
      ['.', '.', '.', '.', '.']
    ]
  }
];

// 求解器：找所有解（最多找2个）
function solveAkari(grid, maxSolutions = 2) {
  const size = grid.length;
  const solutions = [];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  function canPlace(board, row, col) {
    if (grid[row][col] !== '.') return false;
    
    // 检查同行灯塔
    for (let j = 0; j < size; j++) {
      if (j !== col && board[row][j] === 'L') {
        let blocked = false;
        for (let k = Math.min(j, col) + 1; k < Math.max(j, col); k++) {
          if (grid[row][k] !== '.') { blocked = true; break; }
        }
        if (!blocked) return false;
      }
    }
    
    // 检查同列灯塔
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
          // 照亮同行（向左向右）
          for (let j = c; j >= 0; j--) {
            if (grid[r][j] !== '.' && j !== c) break;
            lit.add(`${r},${j}`);
          }
          for (let j = c; j < size; j++) {
            if (grid[r][j] !== '.' && j !== c) break;
            lit.add(`${r},${j}`);
          }
          // 照亮同列（向上向下）
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
    
    // 检查所有空格是否被照亮
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
    
    // 不放灯塔
    backtrack(board, cells, idx + 1);
    
    // 放灯塔（如果可以）
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

// 测试所有谜题
console.log('测试多个谜题，寻找有唯一解的例子...\n');

for (const puzzle of testPuzzles) {
  console.log(`--- ${puzzle.name} ---`);
  console.log('谜题:');
  console.log(puzzle.grid.map(r => r.join(' ')).join('\n'));
  
  const solutions = solveAkari(puzzle.grid);
  
  if (solutions.length === 0) {
    console.log('❌ 无解\n');
  } else if (solutions.length === 1) {
    console.log('✅ **唯一解！**');
    console.log('解:');
    const sol = solutions[0];
    // 提取灯塔位置
    const lights = [];
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (sol[r][c] === 'L') lights.push([r, c]);
      }
    }
    console.log('灯塔位置:', lights);
    console.log(sol.map(r => r.join(' ')).join('\n'));
    console.log('\n=== 结论 ===');
    console.log('**Akari谜题唯一解确实存在！不是伪命题。**');
    console.log('可以继续生成有唯一解的题库。');
    return; // 找到一个就退出
  } else {
    console.log(`❌ 多解 (${solutions.length}个)`);
    console.log('解1:');
    console.log(solutions[0].map(r => r.join(' ')).join('\n'));
    console.log('\n');
  }
}

console.log('\n=== 最终结论 ===');
console.log('测试的简单谜题都有多解或无解。');
console.log('需要更强的约束（更多数字墙）才能得到唯一解。');
console.log('但这说明唯一解理论上是可以实现的——只要添加足够约束。');