/**
 * 扫雷游戏验证器
 * 验证扫雷游戏题目是否有唯一解
 */

/**
 * 验证扫雷游戏题目
 * @param {Object} puzzle 扫雷游戏题目对象
 * @returns {boolean} 是否有效
 */
function validateMinesweeper(puzzle) {
  // 验证数据结构
  if (!puzzle.board || !puzzle.numbers || 
      puzzle.board.length !== puzzle.rows || 
      puzzle.board[0].length !== puzzle.cols) {
    return false;
  }

  // 验证数字与地雷的一致性
  for (let i = 0; i < puzzle.rows; i++) {
    for (let j = 0; j < puzzle.cols; j++) {
      if (puzzle.numbers[i][j] !== -1) {
        // 计算周围地雷数量
        let mineCount = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            if (di === 0 && dj === 0) continue;
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < puzzle.rows && nj >= 0 && nj < puzzle.cols) {
              if (puzzle.board[ni][nj] === true) {
                mineCount++;
              }
            }
          }
        }
        if (puzzle.numbers[i][j] !== mineCount) {
          return false;
        }
      }
    }
  }

  // 验证是否有唯一解
  return hasUniqueSolution(puzzle);
}

/**
 * 检查扫雷游戏是否有唯一解
 * @param {Object} puzzle 扫雷游戏题目对象
 * @returns {boolean} 是否有唯一解
 */
function hasUniqueSolution(puzzle) {
  const { rows, cols, board, numbers } = puzzle;
  
  // 创建一个与原棋盘相同大小的标记数组，用于记录已确定的地雷位置
  const knownMines = Array.from({ length: rows }, () => Array(cols).fill(null));
  
  // 初始化：将所有地雷位置标记为已知
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i][j]) {
        knownMines[i][j] = true; // 已知是地雷
      }
    }
  }
  
  // 尝试通过逻辑推理确定所有地雷位置
  let changed;
  do {
    changed = false;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (numbers[i][j] !== -1) { // 非地雷格子
          // 计算周围已确定的地雷数
          let knownMineCount = 0;
          let unknownCount = 0;
          const unknownCells = [];
          
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              if (di === 0 && dj === 0) continue;
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < rows && nj >= 0 && nj < cols) {
                if (knownMines[ni][nj] === true) {
                  knownMineCount++;
                } else if (knownMines[ni][nj] === null) {
                  unknownCount++;
                  unknownCells.push({ i: ni, j: nj });
                }
              }
            }
          }
          
          // 逻辑推理：如果已知地雷数等于该格子的数字，则周围未知格子都不是地雷
          if (knownMineCount === numbers[i][j] && unknownCount > 0) {
            for (const cell of unknownCells) {
              if (knownMines[cell.i][cell.j] === null) {
                knownMines[cell.i][cell.j] = false; // 确定不是地雷
                changed = true;
              }
            }
          }
          
          // 逻辑推理：如果已知地雷数加上未知格子数等于该格子的数字，则所有未知格子都是地雷
          if (knownMineCount + unknownCount === numbers[i][j] && unknownCount > 0) {
            for (const cell of unknownCells) {
              if (knownMines[cell.i][cell.j] === null) {
                knownMines[cell.i][cell.j] = true; // 确定是地雷
                changed = true;
              }
            }
          }
        }
      }
    }
  } while (changed);
  
  // 检查是否所有格子都已确定
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (knownMines[i][j] === null) {
        // 还有未知格子，说明需要猜测，没有唯一解
        return false;
      }
    }
  }
  
  return true;
}

module.exports = validateMinesweeper;