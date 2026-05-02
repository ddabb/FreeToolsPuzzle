const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { size: 5, count: 1000, minRegions: 3 },
  medium: { size: 7, count: 1000, minRegions: 4 },
  hard: { size: 10, count: 1000, minRegions: 5 }
};

const OUTPUT_DIR = path.join(__dirname, 'data', 'nurikabe');

const CELL_WHITE = 0;
const CELL_BLACK = 1;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_WHITE));
}

function getWhiteRegions(grid) {
  const size = grid.length;
  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const regions = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_WHITE && !visited[r][c]) {
        const region = [];
        const queue = [[r, c]];
        visited[r][c] = true;

        while (queue.length > 0) {
          const [cr, cc] = queue.shift();
          region.push([cr, cc]);

          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dr, dc] of dirs) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                !visited[nr][nc] && grid[nr][nc] === CELL_WHITE) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }

        regions.push(region);
      }
    }
  }

  return regions;
}

function has2x2Black(grid) {
  const size = grid.length;
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (grid[r][c] === CELL_BLACK &&
          grid[r][c + 1] === CELL_BLACK &&
          grid[r + 1][c] === CELL_BLACK &&
          grid[r + 1][c + 1] === CELL_BLACK) {
        return true;
      }
    }
  }
  return false;
}

function areBlackCellsConnected(grid) {
  const size = grid.length;
  let startR = -1;
  let startC = -1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_BLACK) {
        startR = r;
        startC = c;
        break;
      }
    }
    if (startR !== -1) break;
  }

  if (startR === -1) return false;

  const visited = Array(size).fill(null).map(() => Array(size).fill(false));
  const queue = [[startR, startC]];
  let connectedCount = 0;

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    if (visited[cr][cc]) continue;
    if (grid[cr][cc] !== CELL_BLACK) continue;

    visited[cr][cc] = true;
    connectedCount++;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        queue.push([nr, nc]);
      }
    }
  }

  let totalBlack = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_BLACK) totalBlack++;
    }
  }

  return connectedCount === totalBlack;
}

function isValidSolution(grid) {
  if (has2x2Black(grid)) return false;
  if (!areBlackCellsConnected(grid)) return false;

  const regions = getWhiteRegions(grid);
  for (const region of regions) {
    if (region.length < 2) return false;
  }

  return true;
}

function getRegionCenter(region) {
  let sumR = 0;
  let sumC = 0;
  for (const [r, c] of region) {
    sumR += r;
    sumC += c;
  }
  const avgR = sumR / region.length;
  const avgC = sumC / region.length;

  let best = region[0];
  let bestDist = Infinity;
  for (const pos of region) {
    const dist = Math.abs(pos[0] - avgR) + Math.abs(pos[1] - avgC);
    if (dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best;
}

function generateSolution(size, minRegions) {
  const maxAttempts = 300;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    shuffle(cells);

    let blackCount = 0;
    const minBlack = Math.floor(size * size * 0.1);
    const maxBlack = Math.floor(size * size * 0.45);

    for (const [r, c] of cells) {
      if (blackCount >= maxBlack) break;

      grid[r][c] = CELL_BLACK;
      blackCount++;

      if (isValidSolution(grid)) {
      } else {
        grid[r][c] = CELL_WHITE;
        blackCount--;
      }
    }

    const regions = getWhiteRegions(grid);
    if (isValidSolution(grid) && 
        blackCount >= minBlack &&
        regions.length >= minRegions) {
      return grid;
    }
  }

  return null;
}

function gridToNumbers(grid) {
  const size = grid.length;
  const numbers = createEmptyGrid(size);
  const regions = getWhiteRegions(grid);

  for (const region of regions) {
    const num = region.length;
    if (num >= 2) {
      const center = getRegionCenter(region);
      numbers[center[0]][center[1]] = num;
    }
  }

  return numbers;
}

function verifyPuzzle(grid, numbers) {
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (numbers[r][c] > 0 && grid[r][c] !== CELL_WHITE) {
        return false;
      }
    }
  }

  const regions = getWhiteRegions(grid);
  for (const region of regions) {
    let numberCount = 0;
    let numberValue = 0;

    for (const [r, c] of region) {
      if (numbers[r][c] > 0) {
        numberCount++;
        numberValue = numbers[r][c];
      }
    }

    if (numberCount !== 1) return false;
    if (numberValue !== region.length) return false;
  }

  return isValidSolution(grid);
}

function generatePuzzle(size, minRegions) {
  const maxPuzzleAttempts = 50;
  
  for (let pa = 0; pa < maxPuzzleAttempts; pa++) {
    const solution = generateSolution(size, minRegions);
    if (!solution) continue;

    const numbers = gridToNumbers(solution);
    if (!verifyPuzzle(solution, numbers)) continue;

    return { grid: numbers, solution };
  }
  
  return null;
}

function getNextId(difficulty, count) {
  for (let i = 1; i <= count; i++) {
    const fileId = String(i).padStart(4, '0');
    const filename = `${difficulty}-${fileId}.json`;
    const filepath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(filepath)) {
      return i;
    }
  }
  return count + 1;
}

function generateAll() {
  console.log('开始生成数墙题目...\n');
  ensureDir(OUTPUT_DIR);

  let total = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith(difficulty));
    const generated = existingFiles.length;
    const remaining = config.count - generated;
    
    if (remaining <= 0) {
      console.log(`${difficulty} 已完成 ${config.count} 道题目\n`);
      total += config.count;
      continue;
    }

    console.log(`生成 ${difficulty} (${config.size}x${config.size}): 已有 ${generated}/${config.count}, 还需 ${remaining} 道`);

    let success = 0;
    const startTime = Date.now();

    for (let i = getNextId(difficulty, config.count); i <= config.count; i++) {
      const puzzle = generatePuzzle(config.size, config.minRegions);

      if (puzzle) {
        const fileId = String(i).padStart(4, '0');
        const filename = `${difficulty}-${fileId}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);

        const data = {
          id: i,
          difficulty: difficulty,
          size: config.size,
          grid: puzzle.grid,
          solution: puzzle.solution,
          seed: Math.floor(Math.random() * 1000000)
        };

        fs.writeFileSync(filepath, JSON.stringify(data));
        success++;
      }

      if ((generated + success) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  进度: ${generated + success}/${config.count} (${elapsed}s)`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  完成! 成功: ${success}, 耗时: ${time}s\n`);
    total += generated + success;
  }

  console.log(`总计生成 ${total} 道题目`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

generateAll();
