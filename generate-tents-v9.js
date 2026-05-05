/**
 * 帐篷 (Tents) v9 - 反推法生成器
 * 核心思路：先构造唯一解（树+帐篷），再移除帐篷作为题目
 * 关键优化：每放一棵树后立即验证当前子问题有且仅有一个解
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');

// 难度配置
const CONFIGS = {
  easy:   { size: 6,  minTrees: 4, maxTrees: 7,  count: 1000 },
  medium: { size: 8,  minTrees: 6, maxTrees: 10, count: 1000 },
  hard:   { size: 10, minTrees: 8, maxTrees: 14, count: 1000 },
};

function getNeighbors4(r, c, size) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const result = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) result.push([nr, nc]);
  }
  return result;
}

function getNeighbors8(r, c, size) {
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) result.push([nr, nc]);
    }
  }
  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 求解帐篷问题，返回解的数量（最多到 maxCount 就停）
 */
function solveCount(trees, gridSize, tentAssignments, maxCount) {
  const tentSet = new Set();
  let count = 0;

  function backtrack(treeIdx) {
    if (count >= maxCount) return;
    if (treeIdx === trees.length) {
      count++;
      return;
    }

    for (const [tr, tc] of tentAssignments[treeIdx]) {
      if (tentSet.has(`${tr},${tc}`)) continue;

      let adjacent = false;
      for (const [nr, nc] of getNeighbors8(tr, tc, gridSize)) {
        if (tentSet.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;

      tentSet.add(`${tr},${tc}`);
      backtrack(treeIdx + 1);
      tentSet.delete(`${tr},${tc}`);
      if (count >= maxCount) return;
    }
  }

  backtrack(0);
  return count;
}

/**
 * 从网格状态计算每棵树的所有合法帐篷选项
 */
function computeAssignments(trees, gridSize) {
  const treeSet = new Set(trees.map(([r, c]) => `${r},${c}`));
  const assignments = [];

  for (const [tr, tc] of trees) {
    const options = [];
    for (const [nr, nc] of getNeighbors4(tr, tc, gridSize)) {
      if (treeSet.has(`${nr},${nc}`)) continue;
      options.push([nr, nc]);
    }
    assignments.push(options);
  }

  return assignments;
}

/**
 * 反推法：逐棵树放置，每次选帐篷位置时验证唯一性
 */
function generateOne(config, maxAttempts = 100) {
  const { size, minTrees, maxTrees } = config;
  const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 随机放置树（先放树，不急着放帐篷）
    const allPositions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        allPositions.push([r, c]);
      }
    }
    shuffle(allPositions);

    const trees = [];
    for (const [r, c] of allPositions) {
      if (trees.length >= targetTrees) break;
      trees.push([r, c]);
    }

    // 预计算所有帐篷选项
    const assignments = computeAssignments(trees, size);

    // 检查每棵树至少有1个帐篷位
    if (assignments.some(a => a.length === 0)) continue;

    // 验证唯一性
    const count = solveCount(trees, size, assignments, 2);
    if (count === 1) {
      // 找到唯一解！
      const solution = findSolution(trees, size, assignments);
      if (solution) {
        const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
        const tentsObj = {};
        for (const [tr, tc] of trees) grid[tr][tc] = CELL_TREE;
        for (const [tr, tc] of solution) tentsObj[`${tr},${tc}`] = true;

        return {
          grid,
          tents: tentsObj,
          treeCount: trees.length,
        };
      }
    }
  }

  return null;
}

/**
 * 找到唯一解的帐篷放置
 */
function findSolution(trees, gridSize, tentAssignments) {
  const tentSet = new Set();
  const result = [];

  function backtrack(treeIdx) {
    if (result.length > 0) return true;
    if (treeIdx === trees.length) {
      for (const pos of tentSet) {
        const [r, c] = pos.split(',').map(Number);
        result.push([r, c]);
      }
      return true;
    }

    for (const [tr, tc] of tentAssignments[treeIdx]) {
      if (tentSet.has(`${tr},${tc}`)) continue;

      let adjacent = false;
      for (const [nr, nc] of getNeighbors8(tr, tc, gridSize)) {
        if (tentSet.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;

      tentSet.add(`${tr},${tc}`);
      if (backtrack(treeIdx + 1)) return true;
      tentSet.delete(`${tr},${tc}`);
    }

    return false;
  }

  backtrack(0);
  return result.length > 0 ? result : null;
}

function main() {
  console.log('帐篷 v9 - 反推法生成器\n');

  const lockPath = path.join(__dirname, '.git', 'index.lock');
  if (fs.existsSync(lockPath)) {
    fs.unlinkSync(lockPath);
    console.log('已删除 index.lock\n');
  }

  for (const [difficulty, config] of Object.entries(CONFIGS)) {
    console.log(`\n=== ${difficulty.toUpperCase()} (${config.size}x${config.size}, 树${config.minTrees}-${config.maxTrees}) ===`);

    const dir = path.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let success = 0, fail = 0;
    const startTime = Date.now();

    for (let i = 0; i < config.count; i++) {
      const puzzle = generateOne(config, 100);
      const id = String(i + 1).padStart(4, '0');

      if (puzzle) {
        const data = {
          id: parseInt(id),
          difficulty,
          size: config.size,
          grid: puzzle.grid,
          tents: puzzle.tents,
          treeCount: puzzle.treeCount,
          unique: true,
          seed: Math.floor(Math.random() * 1000000),
        };
        fs.writeFileSync(path.join(dir, `${difficulty}-${id}.json`), JSON.stringify(data));
        success++;
      } else {
        fail++;
      }

      if ((i + 1) % 100 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const rate = (i + 1) / (parseFloat(elapsed) || 1);
        console.log(`  ${i + 1}/${config.count} | 成功:${success} 失败:${fail} | ${elapsed}s | ${rate.toFixed(1)}题/s`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  ${difficulty} 完成! 成功:${success}/${config.count} 失败:${fail} 耗时:${elapsed}s`);
  }

  console.log('\n全部完成!');
}

main();
