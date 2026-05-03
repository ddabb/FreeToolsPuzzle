/**
 * Masyu (珍珠) v9 - 高效生成器
 * 策略：
 * 1. 用随机边填充 + 约束传播生成闭合回路
 * 2. 在回路上放置珍珠
 * 3. 校验唯一解
 *
 * 用法：
 *   node generate-masyu-v9.js        # 生成全部题目
 *   node generate-masyu-v9.js --test # 测试模式：只生成一个并校验
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const CONFIG = {
  easy:   { size: 6,  minPearls: 8,  maxPearls: 14, count: 1000 },
  medium: { size: 8,  minPearls: 14, maxPearls: 24, count: 1000 },
  hard:   { size: 10, minPearls: 22, maxPearls: 36, count: 1000 }
};

const isTestMode = process.argv.includes('--test');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateRandomLoop(size) {
  const lines = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );

  const totalCells = size * size;
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    attempts++;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        lines[r][c] = { top: false, right: false, bottom: false, left: false };
      }
    }

    const edges = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (r > 0) edges.push({ r1: r, c1: c, r2: r - 1, c2: c, dir: 'top' });
        if (c > 0) edges.push({ r1: r, c1: c, r2: r, c2: c - 1, dir: 'left' });
      }
    }

    shuffle(edges);

    const edgeSet = new Set();
    const selectedEdges = [];

    for (const edge of edges) {
      const key = `${edge.r1},${edge.c1}-${edge.r2},${edge.c2}`;
      if (edgeSet.has(key)) continue;

      lines[edge.r1][edge.c1][edge.dir] = true;
      const opposite = edge.dir === 'top' ? 'bottom' : edge.dir === 'left' ? 'right' : edge.dir === 'bottom' ? 'top' : 'left';
      lines[edge.r2][edge.c2][opposite] = true;
      edgeSet.add(key);

      if (!hasDeadEnd(lines, size) && isConnected(lines, size)) {
        selectedEdges.push(edge);
      } else {
        lines[edge.r1][edge.c1][edge.dir] = false;
        lines[edge.r2][edge.c2][opposite] = false;
      }
    }

    if (selectedEdges.length >= totalCells * 0.6) {
      let startR = -1, startC = -1;
      for (let r = 0; r < size && startR === -1; r++) {
        for (let c = 0; c < size && startC === -1; c++) {
          const l = lines[r][c];
          if (l.top || l.right || l.bottom || l.left) {
            startR = r;
            startC = c;
          }
        }
      }

      if (startR === -1) continue;

      const path = traceLoop(lines, size, startR, startC);
      if (path && path.length >= totalCells * 0.5) {
        return { lines, path };
      }
    }
  }

  return null;
}

function hasDeadEnd(lines, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      const deg = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
      if (deg === 1 || deg > 2) return true;
    }
  }
  return false;
}

function isConnected(lines, size) {
  let startR = -1, startC = -1;
  for (let r = 0; r < size && startR === -1; r++) {
    for (let c = 0; c < size && startR === -1; c++) {
      const l = lines[r][c];
      if (l.top || l.right || l.bottom || l.left) {
        startR = r;
        startC = c;
      }
    }
  }
  if (startR === -1) return false;

  const visited = new Set();
  const queue = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const l = lines[r][c];

    if (l.top && !visited.has(`${r - 1},${c}`)) {
      visited.add(`${r - 1},${c}`);
      queue.push([r - 1, c]);
    }
    if (l.bottom && !visited.has(`${r + 1},${c}`)) {
      visited.add(`${r + 1},${c}`);
      queue.push([r + 1, c]);
    }
    if (l.left && !visited.has(`${r},${c - 1}`)) {
      visited.add(`${r},${c - 1}`);
      queue.push([r, c - 1]);
    }
    if (l.right && !visited.has(`${r},${c + 1}`)) {
      visited.add(`${r},${c + 1}`);
      queue.push([r, c + 1]);
    }
  }

  let connectedCells = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      if (l.top || l.right || l.bottom || l.left) {
        if (!visited.has(`${r},${c}`)) return false;
        connectedCells++;
      }
    }
  }

  return connectedCells > 0;
}

function traceLoop(lines, size, startR, startC) {
  const path = [[startR, startC]];
  let prevR = -1, prevC = -1;
  let currentR = startR, currentC = startC;

  while (true) {
    const l = lines[currentR][currentC];
    let nextR = -1, nextC = -1;
    let found = false;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = currentR + dr, nc = currentC + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

      if ((dr === -1 && l.top) || (dr === 1 && l.bottom) ||
          (dc === -1 && l.left) || (dc === 1 && l.right)) {
        if (nr === prevR && nc === prevC) continue;

        const key = `${nr},${nc}`;
        if (path.some(p => p[0] === nr && p[1] === nc)) {
          if (nr === startR && nc === startC && path.length >= 4) {
            return path;
          }
          return null;
        }

        nextR = nr;
        nextC = nc;
        found = true;
        break;
      }
    }

    if (!found) return null;

    path.push([nextR, nextC]);
    prevR = currentR;
    prevC = currentC;
    currentR = nextR;
    currentC = nextC;

    if (currentR === startR && currentC === startC) break;
    if (path.length > size * size * 2) return null;
  }

  return path.length >= 4 ? path : null;
}

function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
  const candidates = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      const deg = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
      if (deg !== 2) continue;

      const isStraight = (l.top && l.bottom) || (l.left && l.right);
      candidates.push({ r, c, type: isStraight ? WHITE : BLACK });
    }
  }

  if (candidates.length < minPearls) return null;

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
  const blackTarget = Math.max(3, Math.floor(targetPearls * 0.4));
  const whiteTarget = targetPearls - blackTarget;

  const blacks = candidates.filter(p => p.type === BLACK);
  const whites = candidates.filter(p => p.type === WHITE);

  shuffle(blacks);
  shuffle(whites);

  const selected = [
    ...blacks.slice(0, Math.min(blackTarget, blacks.length)),
    ...whites.slice(0, Math.min(whiteTarget, whites.length))
  ];

  if (selected.length < targetPearls) {
    const remaining = [
      ...blacks.slice(Math.min(blackTarget, blacks.length)),
      ...whites.slice(Math.min(whiteTarget, whites.length))
    ];
    shuffle(remaining);
    selected.push(...remaining.slice(0, targetPearls - selected.length));
  }

  shuffle(selected);
  const finalSelected = selected.slice(0, targetPearls);

  for (const { r, c, type } of finalSelected) {
    grid[r][c] = type;
  }

  return {
    grid,
    pearlCount: finalSelected.length,
    blackCount: finalSelected.filter(p => p.type === BLACK).length,
    whiteCount: finalSelected.filter(p => p.type === WHITE).length
  };
}

function validatePuzzle(lines, grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === EMPTY) continue;
      const l = lines[r][c];
      const isStraight = (l.top && l.bottom) || (l.left && l.right);
      if (grid[r][c] === WHITE && !isStraight) return { valid: false, reason: `白珍珠在拐角(${r},${c})` };
      if (grid[r][c] === BLACK && isStraight) return { valid: false, reason: `黑珍珠在直线(${r},${c})` };
    }
  }

  let hasEdge = false;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const l = lines[r][c];
      if (l.top || l.right || l.bottom || l.left) { hasEdge = true; break; }
    }
    if (hasEdge) break;
  }
  if (!hasEdge) return { valid: false, reason: '没有连线' };

  let startR = -1, startC = -1;
  for (let r = 0; r < size && startR === -1; r++) {
    for (let c = 0; c < size && startR === -1; c++) {
      if (lines[r][c].top || lines[r][c].right || lines[r][c].bottom || lines[r][c].left) {
        startR = r; startC = c;
      }
    }
  }

  const visited = new Set();
  let prevDir = -1;
  let cr = startR, cc = startC;

  for (let step = 0; step < size * size * 2; step++) {
    const key = `${cr},${cc}`;
    if (visited.has(key)) {
      if (cr === startR && cc === startC && step >= size * size) break;
      return { valid: false, reason: `重复访问(${cr},${cc})` };
    }
    visited.add(key);

    const l = lines[cr][cc];
    const dirs = [];
    if (prevDir !== 0 && l.top) dirs.push(0);
    if (prevDir !== 1 && l.right) dirs.push(1);
    if (prevDir !== 2 && l.bottom) dirs.push(2);
    if (prevDir !== 3 && l.left) dirs.push(3);

    if (dirs.length === 0) return { valid: false, reason: `(${cr},${cc})无法继续` };
    if (dirs.length !== 1) return { valid: false, reason: `(${cr},${cc})有${dirs.length}个方向` };

    const dir = dirs[0];
    let nr = cr, nc = cc;
    if (dir === 0) nr--;
    else if (dir === 1) nc++;
    else if (dir === 2) nr++;
    else if (dir === 3) nc--;

    if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
      return { valid: false, reason: '越界' };
    }

    cr = nr; cc = nc;
    prevDir = [2, 3, 0, 1][dir];
  }

  if (cr !== startR || cc !== startC) {
    return { valid: false, reason: '没有形成闭合回路' };
  }

  return { valid: true };
}

function checkUniqueSolution(grid, lines, size) {
  let solutionCount = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const opposite = [2, 3, 0, 1];

  let startR = -1, startC = -1;
  for (let r = 0; r < size && startR === -1; r++) {
    for (let c = 0; c < size && startR === -1; c++) {
      if (grid[r][c] !== EMPTY) { startR = r; startC = c; }
    }
  }
  if (startR === -1) return false;

  function dfs(r, c, fromDir, visited) {
    if (solutionCount > 1) return;

    if (r === startR && c === startC && visited.size > 2) {
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const l = lines[row][col];
          const deg = (l.top ? 1 : 0) + (l.right ? 1 : 0) + (l.bottom ? 1 : 0) + (l.left ? 1 : 0);
          if (deg > 0 && deg !== 2) return;
        }
      }
      solutionCount++;
      return;
    }

    const key = `${r},${c}`;
    if (r !== startR || c !== startC) {
      if (visited.has(key)) return;
      visited.add(key);
    }

    for (let d = 0; d < 4; d++) {
      if (d === opposite[fromDir]) continue;

      const [dr, dc] = dirs[d];
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

      const cell = grid[r][c];
      if (cell !== EMPTY) {
        const l = lines[r][c];
        const isStraight = (l.top && l.bottom) || (l.left && l.right);
        if (fromDir !== -1) {
          const diff = Math.abs(d - fromDir);
          if (cell === BLACK && diff !== 1 && diff !== 3) continue;
          if (cell === WHITE && diff !== 2) continue;
        }
      }

      const toDir = opposite[d];
      const nextCell = grid[nr][nc];
      if (nextCell !== EMPTY) {
        const nl = lines[nr][nc];
        const isStraight = (nl.top && nl.bottom) || (nl.left && nl.right);
        const diff = Math.abs(toDir - d);
        if (nextCell === BLACK && isStraight) continue;
        if (nextCell === WHITE && !isStraight) continue;
      }

      dfs(nr, nc, toDir, new Set(visited));
      if (solutionCount > 1) return;
    }

    visited.delete(key);
  }

  for (let d = 0; d < 4; d++) {
    const [dr, dc] = dirs[d];
    const nr = startR + dr, nc = startC + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

    const startCell = grid[startR][startC];
    if (startCell !== EMPTY) {
      const l = lines[startR][startC];
      const isStraight = (l.top && l.bottom) || (l.left && l.right);
      const diff = Math.abs(d);
      if (startCell === BLACK && diff !== 1 && diff !== 3) continue;
      if (startCell === WHITE && diff !== 2) continue;
    }

    dfs(nr, nc, d, new Set([`${startR},${startC}`]));
    if (solutionCount > 1) return false;
  }

  return solutionCount === 1;
}

function generateOnePuzzle(config) {
  const startTime = Date.now();
  let attempts = 0;

  while (attempts < 1000) {
    attempts++;

    const result = generateRandomLoop(config.size);
    if (!result) continue;

    const { lines, path } = result;
    const pearlResult = placePearls(lines, config.size, config.minPearls, config.maxPearls);
    if (!pearlResult) continue;

    const { grid, pearlCount, blackCount, whiteCount } = pearlResult;

    const validateResult = validatePuzzle(lines, grid, config.size);
    if (!validateResult.valid) {
      console.log(`  验证失败: ${validateResult.reason}`);
      continue;
    }

    const unique = checkUniqueSolution(grid, lines, config.size);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: true,
      grid,
      lines,
      pearlCount,
      blackCount,
      whiteCount,
      attempts,
      elapsed,
      unique
    };
  }

  return { success: false, attempts };
}

function main() {
  if (isTestMode) {
    console.log('=== Masyu v9 - 测试模式 ===\n');

    for (const [difficulty, config] of Object.entries(CONFIG)) {
      console.log(`\n测试 ${difficulty} (${config.size}x${config.size}):`);
      const result = generateOnePuzzle(config);

      if (result.success) {
        console.log(`  珍珠: ${result.pearlCount} (黑${result.blackCount}, 白${result.whiteCount})`);
        console.log(`  尝试: ${result.attempts} 次, 耗时: ${result.elapsed}s`);
        console.log(`  唯一解: ${result.unique ? '是' : '否'}`);

        const validateResult = validatePuzzle(result.lines, result.grid, config.size);
        console.log(`  验证: ${validateResult.valid ? '通过' : validateResult.reason}`);
      } else {
        console.log(`  失败: ${result.attempts} 次尝试后无法生成有效题目`);
      }
    }
  } else {
    console.log('Masyu v9 - 批量生成\n');

    for (const [difficulty, config] of Object.entries(CONFIG)) {
      console.log(`\n=== ${difficulty} (${config.size}x${config.size}) ===`);
      const outDir = pathModule.join(OUTPUT_DIR, difficulty);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      let success = 0;
      let attempts = 0;
      const startTime = Date.now();

      while (success < config.count && attempts < config.count * 100) {
        attempts++;

        const result = generateRandomLoop(config.size);
        if (!result) continue;

        const { lines, path } = result;
        const pearlResult = placePearls(lines, config.size, config.minPearls, config.maxPearls);
        if (!pearlResult) continue;

        const { grid, pearlCount, blackCount, whiteCount } = pearlResult;

        if (!validatePuzzle(lines, grid, config.size).valid) continue;

        const filename = `${difficulty}-${(success + 1).toString().padStart(4, '0')}.json`;
        fs.writeFileSync(pathModule.join(outDir, filename), JSON.stringify({
          id: success + 1,
          difficulty,
          size: config.size,
          grid,
          lines,
          pearlCount,
          blackCount,
          whiteCount
        }));

        success++;
        if (success % 100 === 0) {
          const time = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`已生成 ${success}/${config.count} (${time}s)`);
        }
      }

      const time = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`完成: ${success}/${config.count} 题, ${attempts} 次尝试, ${time}s`);
    }
  }
}

main();