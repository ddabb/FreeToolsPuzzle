/**
 * 帐篷 (Tents) 游戏题目生成器
 * 规则：
 * 1. 每个树旁必须放一个帐篷
 * 2. 帐篷必须紧邻树（上下左右）
 * 3. 每个树只能有一个帐篷
 * 4. 帐篷之间不能水平或垂直相邻
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { size: 6, count: 1000, minTrees: 4, maxTrees: 8 },
  medium: { size: 8, count: 1000, minTrees: 6, maxTrees: 12 },
  hard: { size: 10, count: 1000, minTrees: 8, maxTrees: 16 }
};

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');
const CELL_EMPTY = 0;
const CELL_TREE = 1;

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
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function generateSolution(size, minTrees, maxTrees) {
  const maxAttempts = 200;
  const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    shuffle(cells);

    let treeCount = 0;
    for (const [r, c] of cells) {
      if (treeCount >= targetTrees) break;
      grid[r][c] = CELL_TREE;
      treeCount++;
    }

    if (treeCount < minTrees) continue;

    // 为每棵树分配一个帐篷
    const treeTentMap = {}; // 树位置 -> 帐篷位置
    const tentMap = {};     // 帐篷位置 -> true

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) {
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          shuffle(dirs);
          let placed = false;
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                grid[nr][nc] === CELL_EMPTY &&
                tentMap[`${nr},${nc}`] === undefined) {
              tentMap[`${nr},${nc}`] = true;
              treeTentMap[`${r},${c}`] = `${nr},${nc}`;
              placed = true;
              break;
            }
          }
          if (!placed) break;
        }
      }
    }

    // 检查每棵树是否都有帐篷
    let actualTreeCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) actualTreeCount++;
      }
    }
    if (Object.keys(treeTentMap).length !== actualTreeCount) continue;

    // 检查每个帐篷是否都与一棵树相邻
    for (const tentPos in tentMap) {
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      let hasAdjacentTree = false;
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === CELL_TREE) {
          hasAdjacentTree = true;
          break;
        }
      }
      if (!hasAdjacentTree) {
        tentMap[tentPos] = false; // 标记无效
      }
    }

    // 检查帐篷之间是否相邻
    let tentsAdjacent = false;
    for (const tentPos in tentMap) {
      if (!tentMap[tentPos]) continue;
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && tentMap[key]) {
          tentsAdjacent = true;
          break;
        }
      }
      if (tentsAdjacent) break;
    }
    if (tentsAdjacent) continue;

    // 最终验证：确保每个有效帐篷都只对应一棵树
    let valid = true;
    for (const tentPos in tentMap) {
      if (!tentMap[tentPos]) continue;
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      let adjacentTreeCount = 0;
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === CELL_TREE) {
          adjacentTreeCount++;
        }
      }
      if (adjacentTreeCount !== 1) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    return { grid, tents: tentMap };
  }

  return null;
}

function generatePuzzle(size, minTrees, maxTrees) {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const solution = generateSolution(size, minTrees, maxTrees);
    if (!solution) continue;

    const grid = solution.grid;
    return { grid, tents: solution.tents };
  }

  return null;
}

function generateAll() {
  console.log('开始生成帐篷题目...\n');
  ensureDir(OUTPUT_DIR);

  let total = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    const difficultyDir = path.join(OUTPUT_DIR, difficulty);
    ensureDir(difficultyDir);

    console.log(`生成 ${difficulty} (${config.size}x${config.size}, ${config.count}题)...`);

    let success = 0;
    let fail = 0;
    const startTime = Date.now();

    for (let i = 1; i <= config.count; i++) {
      const puzzle = generatePuzzle(config.size, config.minTrees, config.maxTrees);

      if (puzzle) {
        const fileId = String(i).padStart(4, '0');
        const filename = `${difficulty}-${fileId}.json`;
        const filepath = path.join(difficultyDir, filename);

        const data = {
          id: i,
          difficulty: difficulty,
          size: config.size,
          grid: puzzle.grid,
          tents: puzzle.tents,
          seed: Math.floor(Math.random() * 1000000)
        };

        fs.writeFileSync(filepath, JSON.stringify(data));
        success++;
      } else {
        fail++;
      }

      if (i % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${i}/${config.count} (${elapsed}s)`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  完成! 成功: ${success}, 失败: ${fail}, 耗时: ${time}s\n`);
    total += success;
  }

  console.log(`总计生成 ${total} 道题目`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

generateAll();