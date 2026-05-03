/**
 * Masyu 唯一解校验器
 * 1. 验证现有解是否形成有效闭合回路
 * 2. 统计解的数量（最多统计到 maxCount）
 */

const fs = require('fs');
const path = require('path');

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const DIR_DELTA = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const DIR_NAMES = ['top', 'right', 'bottom', 'left'];
const OPPOSITE = [2, 3, 0, 1];

function parseGrid(grid, size) {
  if (typeof grid[0][0] === 'string') {
    return grid.map(row => row.map(cell => {
      if (cell === 'B') return BLACK;
      if (cell === 'W') return WHITE;
      return EMPTY;
    }));
  }
  return grid;
}

function validateSolutionLines(lines, grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const line = lines[r][c];
      const cell = grid[r][c];
      const edgeCount = (line.top ? 1 : 0) + (line.right ? 1 : 0) + (line.bottom ? 1 : 0) + (line.left ? 1 : 0);

      if (edgeCount === 0) continue;

      if (edgeCount !== 2) {
        return { valid: false, reason: `格子(${r},${c})有${edgeCount}条边而非2条` };
      }

      const isStraight = (line.top && line.bottom) || (line.left && line.right);
      if (cell === WHITE && !isStraight) {
        return { valid: false, reason: `白珍珠(${r},${c})不是直线` };
      }
      if (cell === BLACK && isStraight) {
        return { valid: false, reason: `黑珍珠(${r},${c})不是拐角` };
      }
    }
  }

  let startR = -1, startC = -1;
  outer:
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lines[r][c].top || lines[r][c].right || lines[r][c].bottom || lines[r][c].left) {
        startR = r;
        startC = c;
        break outer;
      }
    }
  }

  if (startR === -1) {
    return { valid: false, reason: '没有连线' };
  }

  const visited = new Set();
  let cr = startR, cc = startC, prevDir = -1, steps = 0;

  while (steps < size * size * 4) {
    const key = `${cr},${cc}`;
    if (visited.has(key) && cr === startR && cc === startC) {
      break;
    }
    if (visited.has(key)) {
      return { valid: false, reason: `重复访问(${cr},${cc})` };
    }
    visited.add(key);

    const dirs = [];
    for (let d = 0; d < 4; d++) {
      if (d === OPPOSITE[prevDir]) continue;
      const line = lines[cr][cc];
      if (line[DIR_NAMES[d]]) dirs.push(d);
    }

    if (dirs.length === 0) {
      return { valid: false, reason: `(${cr},${cc})无法继续` };
    }
    if (dirs.length !== 1) {
      return { valid: false, reason: `(${cr},${cc})有${dirs.length}个方向` };
    }

    const d = dirs[0];
    const [dr, dc] = DIR_DELTA[d];
    const nr = cr + dr, nc = cc + dc;

    if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
      return { valid: false, reason: `(${cr},${cc})向${DIR_NAMES[d]}越界` };
    }

    const cell = grid[cr][cc];
    if (cell !== EMPTY) {
      const isStraight = (lines[cr][cc].top && lines[cr][cc].bottom) || (lines[cr][cc].left && lines[cr][cc].right);
      if (cell === BLACK) {
        const diff = Math.abs(d - prevDir);
        if (prevDir >= 0 && diff !== 1 && diff !== 3) {
          return { valid: false, reason: `黑珍珠(${cr},${cc})没有转弯` };
        }
      }
      if (cell === WHITE) {
        if (prevDir >= 0 && Math.abs(d - prevDir) !== 2) {
          return { valid: false, reason: `白珍珠(${cr},${cc})没有直线穿过` };
        }
      }
    }

    cr = nr;
    cc = nc;
    prevDir = d;
    steps++;
  }

  if (cr !== startR || cc !== startC) {
    return { valid: false, reason: '没有回到起点' };
  }

  return { valid: true };
}

function countSolutions(grid, size, maxCount = 2) {
  const pearls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== EMPTY) {
        pearls.push([r, c]);
      }
    }
  }

  if (pearls.length === 0) return 0;

  const lines = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );

  const [startR, startC] = pearls[0];
  let solutionCount = 0;
  let oneSolution = null;

  function checkPearl(r, c, fromDir, toDir) {
    const cell = grid[r][c];
    if (cell === EMPTY) return true;

    const isStraight = (lines[r][c].top && lines[r][c].bottom) || (lines[r][c].left && lines[r][c].right);

    if (cell === BLACK) {
      if (isStraight) return false;
      if (fromDir >= 0) {
        const diff = Math.abs(toDir - fromDir);
        if (diff !== 1 && diff !== 3) return false;
      }
    } else if (cell === WHITE) {
      if (!isStraight) return false;
      if (fromDir >= 0 && Math.abs(toDir - fromDir) !== 2) return false;
    }
    return true;
  }

  function dfs(r, c, fromDir, visited) {
    if (solutionCount >= maxCount) return;

    if (r === startR && c === startC && visited.size > 2) {
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          if (lines[i][j].top || lines[i][j].right || lines[i][j].bottom || lines[i][j].left) {
            const e = (lines[i][j].top ? 1 : 0) + (lines[i][j].right ? 1 : 0) +
                      (lines[i][j].bottom ? 1 : 0) + (lines[i][j].left ? 1 : 0);
            if (e !== 2) return;
          }
        }
      }
      solutionCount++;
      if (!oneSolution) {
        oneSolution = lines.map(row => row.map(cell => ({...cell})));
      }
      return;
    }

    const key = `${r},${c}`;
    if (r !== startR || c !== startC) {
      if (visited.has(key)) return;
      visited.add(key);
    }

    for (let d = 0; d < 4; d++) {
      if (d === OPPOSITE[fromDir]) continue;

      const [dr, dc] = DIR_DELTA[d];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

      const toDir = OPPOSITE[d];
      if (!checkPearl(nr, nc, fromDir, toDir)) continue;

      lines[r][c][DIR_NAMES[d]] = true;
      lines[nr][nc][DIR_NAMES[toDir]] = true;

      dfs(nr, nc, toDir, visited);

      lines[r][c][DIR_NAMES[d]] = false;
      lines[nr][nc][DIR_NAMES[toDir]] = false;
    }

    visited.delete(key);
  }

  for (let d = 0; d < 4; d++) {
    const [dr, dc] = DIR_DELTA[d];
    const nr = startR + dr, nc = startC + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

    const toDir = OPPOSITE[d];
    if (!checkPearl(startR, startC, -1, d)) continue;
    if (!checkPearl(nr, nc, d, toDir)) continue;

    lines[startR][startC][DIR_NAMES[d]] = true;
    lines[nr][nc][DIR_NAMES[toDir]] = true;

    dfs(nr, nc, toDir, new Set([`${startR},${startC}`]));

    lines[startR][startC][DIR_NAMES[d]] = false;
    lines[nr][nc][DIR_NAMES[toDir]] = false;

    if (solutionCount >= maxCount) break;
  }

  return { count: solutionCount, solution: oneSolution };
}

function validatePuzzleFile(filepath) {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const size = data.size;
  const grid = parseGrid(data.grid, size);

  const lineResult = validateSolutionLines(data.lines, grid, size);
  if (!lineResult.valid) {
    return { valid: false, reason: lineResult.reason, solutionValid: false };
  }

  const solutionResult = countSolutions(grid, size, 2);
  return {
    valid: true,
    solutionValid: true,
    solutionCount: solutionResult.count,
    unique: solutionResult.count === 1
  };
}

function main() {
  const baseDir = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';
  const difficulties = ['easy', 'medium', 'hard'];
  const counts = { easy: 702, medium: 0, hard: 0 };

  console.log('=== Masyu 题目校验 ===\n');

  for (const diff of difficulties) {
    const dir = path.join(baseDir, diff);
    if (!fs.existsSync(dir)) {
      console.log(`${diff}: 目录不存在\n`);
      continue;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    const maxCount = counts[diff] || files.length;

    let validCount = 0, invalidCount = 0, uniqueCount = 0, multiCount = 0;
    const startTime = Date.now();

    console.log(`${diff}: 检查 ${Math.min(files.length, maxCount)} 题...`);

    for (let i = 0; i < Math.min(files.length, maxCount); i++) {
      const file = files[i];
      const filepath = path.join(dir, file);

      try {
        const result = validatePuzzleFile(filepath);

        if (!result.valid || !result.solutionValid) {
          invalidCount++;
          console.log(`  ${file}: 无效 - ${result.reason}`);
        } else if (result.unique) {
          validCount++;
          uniqueCount++;
        } else {
          validCount++;
          multiCount++;
          console.log(`  ${file}: 多解 (${result.solutionCount})`);
        }
      } catch (e) {
        invalidCount++;
        console.log(`  ${file}: 错误 - ${e.message}`);
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  进度: ${i + 1}/${Math.min(files.length, maxCount)}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`${diff}: 有效=${validCount}, 无效=${invalidCount}, 唯一解=${uniqueCount}, 多解=${multiCount} (${elapsed}s)\n`);
  }
}

main();