/**
 * 战舰游戏验证器
 * 验证战舰游戏题目的基本有效性
 */

function validateBattleship(puzzle) {
  if (!puzzle.rowClues || !puzzle.colClues || !puzzle.ships || 
      puzzle.rowClues.length !== puzzle.size || 
      puzzle.colClues.length !== puzzle.size) {
    return false;
  }

  const size = puzzle.size;

  for (let i = 0; i < size; i++) {
    if (typeof puzzle.rowClues[i] !== 'number' || puzzle.rowClues[i] < 0) {
      return false;
    }
  }

  for (let i = 0; i < size; i++) {
    if (typeof puzzle.colClues[i] !== 'number' || puzzle.colClues[i] < 0) {
      return false;
    }
  }

  if (!Array.isArray(puzzle.ships)) {
    return false;
  }

  for (const ship of puzzle.ships) {
    if (typeof ship.size !== 'number' || ship.size < 1 || 
        typeof ship.r !== 'number' || ship.r < 0 || 
        typeof ship.c !== 'number' || ship.c < 0 || 
        typeof ship.horizontal !== 'boolean') {
      return false;
    }
  }

  return true;
}

module.exports = validateBattleship;