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

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateClosedLoop(size) {
  const path = [];
  const visited = new Set();

  const startR = 0, startC = 0;

  function dfs(r, c) {
    path.push([r, c]);
    visited.add(`${r},${c}`);

    if (path.length === size * size) {
      const [sr, sc] = path[0];
      const dr = Math.abs(r - sr), dc = Math.abs(c - sc);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        return true;
      }
    }

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    shuffle(dirs);

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(`${nr},${nc}`)) {
        if (dfs(nr, nc)) {
          return true;
        }
      }
    }

    path.pop();
    visited.delete(`${r},${c}`);
    return false;
  }

  dfs(startR, startC);
  return path;
}

function generateRandomLoop(size) {
  let path = generateClosedLoop(size);
  for (let i = 0; i < 100; i++) {
    path = randomLocalRewire(path, size) || path;
  }

  const transforms = [
    (p) => p.map(([r, c]) => [r, c]),
    (p) => p.map(([r, c]) => [r, size - 1 - c]),
    (p) => p.map(([r, c]) => [size - 1 - r, c]),
    (p) => p.map(([r, c]) => [size - 1 - r, size - 1 - c]),
    (p) => p.map(([r, c]) => [c, size - 1 - r]),
    (p) => p.map(([r, c]) => [size - 1 - c, r]),
  ];
  const transform = transforms[Math.floor(Math.random() * transforms.length)];
  path = transform(path);

  const offset = Math.floor(Math.random() * path.length);
  path = [...path.slice(offset), ...path.slice(0, offset)];

  return path;
}

function isValidPath(path, size) {
  if (path.length !== size * size) return false;
  const seen = new Set();
  for (const [r, c] of path) {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const key = r * size + c;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function isClosedLoop(path) {
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % n];
    const dr = Math.abs(r1 - r2), dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;
  }
  return true;
}

function twoOptSwap(path, i, j) {
  const newPath = [...path];
  let left = i, right = j;
  while (left < right) {
    [newPath[left], newPath[right]] = [newPath[right], newPath[left]];
    left++;
    right--;
  }
  return newPath;
}

function randomLocalRewire(path, size) {
  const n = path.length;
  const posMap = new Map();
  for (let i = 0; i < n; i++) {
    posMap.set(path[i][0] * size + path[i][1], i);
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const i = Math.floor(Math.random() * n);
    const [r1, c1] = path[i];
    const neighbors = [];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r1 + dr, nc = c1 + dc;
      if (nr >=0 && nr < size && nc >=0 && nc < size) {
        const j = posMap.get(nr * size + nc);
        if (j !== undefined) {
          const dist = Math.abs(j - i);
          if (dist > 1 && dist < n - 1) {
            neighbors.push(j);
          }
        }
      }
    }
    if (neighbors.length === 0) continue;
    const j = neighbors[Math.floor(Math.random() * neighbors.length)];
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    const newPath = twoOptSwap(path, lo + 1, hi - 1);
    if (isClosedLoop(newPath) && isValidPath(newPath, size)) {
      return newPath;
    }
  }
  return null;
}

function pathToLines(path, size) {
  const lines = Array.from({length: size}, () => Array.from({length: size}, () => ({top: false, right: false, bottom: false, left: false})));
  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];
    if (r2 === r1 - 1) {
      lines[r1][c1].top = true;
      lines[r2][c2].bottom = true;
    } else if (r2 === r1 + 1) {
      lines[r1][c1].bottom = true;
      lines[r2][c2].top = true;
    } else if (c2 === c1 - 1) {
      lines[r1][c1].left = true;
      lines[r2][c2].right = true;
    } else if (c2 === c1 + 1) {
      lines[r1][c1].right = true;
      lines[r2][c2].left = true;
    }
  }
  return lines;
}

function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array.from({length: size}, () => Array(size).fill(EMPTY));
  const straights = [];
  const corners = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      if (isStraight) {
        straights.push([r, c]);
      } else {
        corners.push([r, c]);
      }
    }
  }

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
  const blackTarget = Math.max(3, Math.round(targetPearls * 0.4));
  const whiteTarget = targetPearls - blackTarget;

  shuffle(straights);
  shuffle(corners);

  const selectedBlacks = corners.slice(0, Math.min(blackTarget, corners.length));
  const selectedWhites = straights.slice(0, Math.min(whiteTarget, straights.length));

  let selected = [...selectedBlacks, ...selectedWhites];

  if (selected.length < targetPearls) {
    const extraCorners = corners.slice(selectedBlacks.length);
    const extraStraights = straights.slice(selectedWhites.length);
    const remaining = shuffle([...extraCorners, ...extraStraights]);
    selected = [...selected, ...remaining.slice(0, targetPearls - selected.length)];
  }

  selected = selected.slice(0, targetPearls);

  for (const [r, c] of selected) {
    const cell = lines[r][c];
    const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
    grid[r][c] = isStraight ? WHITE : BLACK;
  }

  const blackCount = selected.filter(([r, c]) => grid[r][c] === BLACK).length;
  const whiteCount = selected.filter(([r, c]) => grid[r][c] === WHITE).length;

  return {grid, pearlCount: selected.length, blackCount, whiteCount};
}

function validatePuzzle(lines, grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === EMPTY) continue;
      const cell = lines[r][c];
      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      if (grid[r][c] === WHITE && !isStraight) return false;
      if (grid[r][c] === BLACK && isStraight) return false;
    }
  }
  return true;
}

function main() {
  console.log('Masyu - 重新生成\n');
  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}x${config.size}) ===`);
    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, {recursive: true});
    }
    let success = 0;
    const startTime = Date.now();
    while (success < config.count) {
      const path = generateRandomLoop(config.size);
      const lines = pathToLines(path, config.size);
      const {grid, pearlCount, blackCount, whiteCount} = placePearls(lines, config.size, config.minPearls, config.maxPearls);
      if (!validatePuzzle(lines, grid, config.size)) continue;

      const filename = `${difficulty}-${(success + 1).toString().padStart(4, '0')}.json`;
      const filepath = pathModule.join(outDir, filename);

      fs.writeFileSync(filepath, JSON.stringify({
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
    console.log(`完成: ${success}/${config.count} 题, 耗时 ${time}s`);
  }
}

main();
