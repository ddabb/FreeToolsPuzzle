/**
 * 验证Akari谜题唯一解是否存在
 * 通过手工构造一个简单谜题并验证其唯一性
 */

console.log('=== 验证Akari谜题唯一解是否存在 ===\n');

// 简单的5x5谜题（手工构造）
// . = 空格（需要照亮）
// # = 墙（无数字）
// 0-4 = 数字墙（周围恰好N个灯塔）

// 谜题设计：
// 1. 放置一些数字墙来约束灯塔位置
// 2. 确保只有一个有效的灯塔布局

const testPuzzle = {
  size: 5,
  grid: [
    ['.', '.', '1', '.', '.'],
    ['.', '#', '.', '#', '.'],
    ['0', '.', '.', '.', '0'],
    ['.', '#', '.', '#', '.'],
    ['.', '.', '1', '.', '.']
  ]
};

console.log('测试谜题:');
console.log(testPuzzle.grid.map(r => r.join(' ')).join('\n'));
console.log();

// 求解器：找所有解
function solveAkari(grid) {
  const size = grid.length;
  const solutions = [];
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  // 检查灯塔是否可以放置
  function canPlace(board, row, col) {
    // 检查是否是墙
    if (grid[row][col] !== '.') return false;
    
    // 检查同行同列是否有其他灯塔（中间没有墙阻挡）
    for (let j = 0; j < size; j++) {
      if (j !== col && board[row][j] === 'L') {
        // 检查中间是否有墙
        let hasWall = false;
        const [min, max] = [Math.min(j, col), Math.max(j, col)];
        for (let k = min + 1; k < max; k++) {
          if (grid[row][k] !== '.') { hasWall = true; break; }
        }
        if (!hasWall) return false;
      }
    }
    for (let i = 0; i < size; i++) {
      if (i !== row && board[i][col] === 'L') {
        let hasWall = false;
        const [min, max] = [Math.min(i, row), Math.max(i, row)];
        for (let k = min + 1; k < max; k++) {
          if (grid[k][col] !== '.') { hasWall = true; break; }
        }
        if (!hasWall) return false;
      }
    }
    return true;
  }
  
  // 检查数字墙约束
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
  
  // 检查所有格子是否被照亮
  function checkAllLit(board) {
    const lit = new Set();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 'L') {
          // 照亮同行
          for (let j = c; j >= 0; j--) {
            if (grid[r][j] !== '.') break;
            lit.add(`${r},${j}`);
          }
          for (let j = c; j < size; j++) {
            if (grid[r][j] !== '.') break;
            lit.add(`${r},${j}`);
          }
          // 照亮同列
          for (let i = r; i >= 0; i--) {
            if (grid[i][c] !== '.') break;
            lit.add(`${i},${c}`);
          }
          for (let i = r; i < size; i++) {
            if (grid[i][c] !== '.') break;
            lit.add(`${i},${c}`);
          }
        }
      }
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === '.' && !lit.has(`${r},${c}`)) {
          return false;
        }
      }
    }
    return true;
  }
  
  // 回溯搜索
  function backtrack(board, cells, idx) {
    if (solutions.length >= 2) return; // 找到2个解就停止
    
    if (idx === cells.length) {
      // 检查约束
      if (checkNumberConstraints(board) && checkAllLit(board)) {
        solutions.push(board.map(r => [...r]));
      }
      return;
    }
    
    const [r, c] = cells[idx];
    
    // 尝试不放灯塔
    const boardNoLight = board.map(row => [...row]);
    backtrack(boardNoLight, cells, idx + 1);
    
    // 尝试放灯塔
    if (canPlace(board, r, c)) {
      const boardWithLight = board.map(row => [...row]);
      boardWithLight[r][c] = 'L';
      backtrack(boardWithLight, cells, idx + 1);
    }
  }
  
  // 收集所有空格
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '.') cells.push([r, c]);
    }
  }
  
  const board = grid.map(row => [...row]);
  backtrack(board, cells, 0);
  
  return solutions;
}

// 求解
console.log('求解中...\n');
const solutions = solveAkari(testPuzzle.grid);

console.log(`找到 ${solutions.length} 个解\n`);

if (solutions.length === 0) {
  console.log('❌ 无解 - 谜题设计有问题');
} else if (solutions.length === 1) {
  console.log('✅ 唯一解存在！');
  console.log('\n解:');
  console.log(solutions[0].map(r => r.join(' ')).join('\n'));
} else {
  console.log('❌ 多解 - 不是唯一解');
  console.log('\n解1:');
  console.log(solutions[0].map(r => r.join(' ')).join('\n'));
  console.log('\n解2:');
  console.log(solutions[1].map(r => r.join(' ')).join('\n'));
}

console.log('\n=== 结论 ===');
if (solutions.length === 1) {
  console.log('Akari谜题唯一解**不是伪命题**，确实存在。');
  console.log('现在可以继续生成有唯一解的题库。');
} else {
  console.log('这个测试谜题设计不够好，需要调整约束。');
  console.log('但Akari谜题唯一解理论上是可以存在的。');
}
