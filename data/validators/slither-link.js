/**
 * 数回游戏验证器
 * 验证数回游戏题目的基本有效性
 */

function validateSlitherLink(puzzle) {
  if (!puzzle.grid || puzzle.grid.length !== puzzle.size) {
    return false;
  }

  for (let i = 0; i < puzzle.size; i++) {
    if (!puzzle.grid[i] || puzzle.grid[i].length !== puzzle.size) {
      return false;
    }
  }

  const size = puzzle.size;
  const grid = puzzle.grid;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = grid[i][j];
      if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell > 4) {
        return false;
      }
    }
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const cell = grid[i][j];
      if (cell > 0) {
        let maxEdges = 4;
        if (i === 0) maxEdges--;
        if (i === size - 1) maxEdges--;
        if (j === 0) maxEdges--;
        if (j === size - 1) maxEdges--;
        if (cell > maxEdges) {
          return false;
        }
      }
    }
  }

  return true;
}

module.exports = validateSlitherLink;