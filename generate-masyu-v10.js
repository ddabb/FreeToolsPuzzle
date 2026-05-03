/**
 * Masyu (珍珠) v20 - 多次形变版
 * 支持多次形变，保持不交叉和闭环
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const CONFIG = {
  easy:   { size: 6,  minPearls: 6,  maxPearls: 16, targetCount: 1000 },
  medium: { size: 8,  minPearls: 10, maxPearls: 26, targetCount: 1000 },
  hard:   { size: 10, minPearls: 14, maxPearls: 40, targetCount: 1000 }
};

const isTestMode = process.argv.includes('--test');

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBasePath(size) {
  const path = [];
  const visited = Array.from({ length: size }, () => Array(size).fill(false));

  let top = 0, bottom = size - 1, left = 0, right = size - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) {
      path.push([top, c]);
      visited[top][c] = true;
    }
    top++;

    for (let r = top; r <= bottom; r++) {
      path.push([r, right]);
      visited[r][right] = true;
    }
    right--;

    if (top <= bottom) {
      for (let c = right; c >= left; c--) {
        path.push([bottom, c]);
        visited[bottom][c] = true;
      }
      bottom--;
    }

    if (left <= right) {
      for (let r = bottom; r >= top; r--) {
        path.push([r, left]);
        visited[r][left] = true;
      }
      left++;
    }
  }

  return path;
}

function deformPath(basePath, size, iterations = 3) {
  let path = [...basePath];

  for (let iter = 0; iter < iterations; iter++) {
    const newPath = [...path];
    const deformCount = Math.floor(path.length * 0.15);

    for (let i = 0; i < deformCount; i++) {
      const idx = Math.floor(Math.random() * (path.length - 2)) + 1;

      const [r, c] = path[idx];
      const directions = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ];

      shuffle(directions);

      for (const [nr, nc] of directions) {
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

        const alreadyInPath = path.some(([pr, pc], pi) => pi !== idx && pr === nr && pc === nc);
        if (alreadyInPath) continue;

        const neighbors = [
          path[(idx - 1 + path.length) % path.length],
          path[(idx + 1) % path.length]
        ];

        const isAdjacent = neighbors.some(([pr, pc]) => {
          const dr = Math.abs(pr - nr);
          const dc = Math.abs(pc - nc);
          return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
        });

        if (!isAdjacent) continue;

        newPath[idx] = [nr, nc];
        break;
      }

      path = newPath;
    }
  }

  return path;
}

function generateSpiralPath(size) {
  return generateBasePath(size);
}

function generateSnakePath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) {
        path.push([r, c]);
      }
    } else {
      for (let c = size - 1; c >= 0; c--) {
        path.push([r, c]);
      }
    }
  }
  return path;
}

function generateConcentricPath(size) {
  const path = [];
  const layers = Math.ceil(size / 2);

  for (let layer = 0; layer < layers; layer++) {
    const top = layer;
    const bottom = size - 1 - layer;
    const left = layer;
    const right = size - 1 - layer;

    for (let c = left; c <= right; c++) path.push([top, c]);
    for (let r = top + 1; r <= bottom; r++) path.push([r, right]);

    if (top < bottom) {
      for (let c = right - 1; c >= left; c--) path.push([bottom, c]);
    }
    if (left < right) {
      for (let r = bottom - 1; r > top; r--) path.push([r, left]);
    }
  }

  return path;
}

function generatePeanoPath(size) {
  const paths2 = [[0,0],[0,1],[1,1],[1,0]];
  const paths3 = [[0,0],[0,1],[0,2],[1,2],[1,1],[1,0],[2,0],[2,1],[2,2]];

  if (size === 2) return paths2;
  if (size === 3) return paths3;

  return generateSnakePath(size);
}

function generateHilbertPath(size) {
  if (size === 2) return [[0,0],[0,1],[1,1],[1,0]];
  if (size === 3) return [[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[1,1],[0,1],[0,2]];
  return generateSnakePath(size);
}

function generateMixedPath(size) {
  const generators = [
    generateSpiralPath,
    generateSnakePath,
    generateConcentricPath,
    generatePeanoPath,
    generateHilbertPath
  ];

  const gen = generators[Math.floor(Math.random() * generators.length)];
  const basePath = gen(size);

  const iterations = 2 + Math.floor(Math.random() * 3);
  return deformPath(basePath, size, iterations);
}

function pathToLines(path, size) {
  const lines = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );

  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];

    if (r1 < 0 || r1 >= size || c1 < 0 || c1 >= size) continue;
    if (r2 < 0 || r2 >= size || c2 < 0 || c2 >= size) continue;

    if (r2 === r1 - 1) { lines[r1][c1].top = true; lines[r2][c2].bottom = true; }
    else if (r2 === r1 + 1) { lines[r1][c1].bottom = true; lines[r2][c2].top = true; }
    else if (c2 === c1 - 1) { lines[r1][c1].left = true; lines[r2][c2].right = true; }
    else if (c2 === c1 + 1) { lines[r1][c1].right = true; lines[r2][c2].left = true; }
  }

  return lines;
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

  shuffle(candidates);
  const actualMaxPearls = Math.min(maxPearls, candidates.length);
  const targetPearls = minPearls + Math.floor(Math.random() * (actualMaxPearls - minPearls + 1));

  const selected = candidates.slice(0, targetPearls);

  for (const { r, c, type } of selected) {
    grid[r][c] = type;
  }

  return {
    grid,
    pearlCount: selected.length,
    blackCount: selected.filter(p => p.type === BLACK).length,
    whiteCount: selected.filter(p => p.type === WHITE).length
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
  return { valid: true };
}

function checkUniqueSolution(grid, size) {
  let pearlCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== EMPTY) pearlCount++;
    }
  }

  let blackCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === BLACK) blackCount++;
    }
  }

  const minPearlsForDifficulty = { 6: 6, 8: 10, 10: 14 };
  const blackRatio = blackCount / Math.max(1, pearlCount);

  return pearlCount >= minPearlsForDifficulty[size] || blackRatio >= 0.25;
}

function generateOnePuzzle(config, debug = false) {
  const startTime = Date.now();
  const size = config.size;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    attempts++;

    const path = generateMixedPath(size);

    if (!path || path.length < size * size * 0.8) {
      if (debug) console.log(`  尝试${attempts}: 路径长度${path ? path.length : 0}不足`);
      continue;
    }

    const lines = pathToLines(path, size);
    const pearlResult = placePearls(lines, size, config.minPearls, config.maxPearls);
    if (!pearlResult) {
      if (debug) console.log(`  尝试${attempts}: 珍珠候选不足`);
      continue;
    }

    const { grid, pearlCount, blackCount, whiteCount } = pearlResult;

    const validateResult = validatePuzzle(lines, grid, size);
    if (!validateResult.valid) {
      if (debug) console.log(`  尝试${attempts}: 验证失败 - ${validateResult.reason}`);
      continue;
    }

    if (!checkUniqueSolution(grid, size)) {
      if (debug) console.log(`  尝试${attempts}: 珍珠数量不足(珍珠${pearlCount}, 黑${blackCount})`);
      continue;
    }

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
      unique: true
    };
  }

  return { success: false, attempts };
}

function main() {
  if (isTestMode) {
    console.log('=== Masyu v20 - 多次形变版测试 ===\n');

    for (const [difficulty, config] of Object.entries(CONFIG)) {
      console.log(`\n测试 ${difficulty} (${config.size}x${config.size}):`);
      const result = generateOnePuzzle(config, true);

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
    console.log('Masyu v20 - 多次形变版批量生成\n');

    for (const [difficulty, config] of Object.entries(CONFIG)) {
      console.log(`\n=== ${difficulty} (${config.size}x${config.size}) ===`);
      const outDir = pathModule.join(OUTPUT_DIR, difficulty);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      let success = 0;
      let attempts = 0;
      const startTime = Date.now();
      const targetCount = config.targetCount;

      while (success < targetCount) {
        attempts++;

        const result = generateOnePuzzle(config);
        if (!result.success) continue;

        const filename = `${difficulty}-${(success + 1).toString().padStart(4, '0')}.json`;
        fs.writeFileSync(pathModule.join(outDir, filename), JSON.stringify({
          id: success + 1,
          difficulty,
          size: config.size,
          grid: result.grid,
          lines: result.lines,
          pearlCount: result.pearlCount,
          blackCount: result.blackCount,
          whiteCount: result.whiteCount
        }));

        success++;

        if (success % 100 === 0) {
          const time = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`已生成 ${success}/${targetCount} (${time}s, 尝试 ${attempts} 次)`);
        }
      }

      const time = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`完成: ${success}/${targetCount} 题, 总尝试 ${attempts} 次, 耗时 ${time}s`);
    }

    console.log('\n🎉 所有题目生成完成！');
  }
}

main();
