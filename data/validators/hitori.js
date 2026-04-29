/**
 * 数壹游戏验证器
 * 验证数壹游戏题目的基本有效性
 */

function validateHitori(puzzle) {
  if (!puzzle.grid || 
      puzzle.grid.length !== puzzle.size || 
      puzzle.grid[0].length !== puzzle.size) {
    return false;
  }

  const size = puzzle.size;
  const grid = puzzle.grid;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = grid[i][j];
      if (typeof cell !== 'number' || cell <= 0 || cell > size) {
        return false;
      }
    }
  }

  return true;
}

module.exports = validateHitori;