/**
 * Tents v13 - 逆向构建法
 * 策略：先放树和帐篷组成完整解，再移除帐篷作为谜题
 * 关键：树-树相邻 → 各自帐篷位受限 → 解更唯一
 */

const fs = require('fs');
const path = require('path');

const CELL_EMPTY = 0;
const CELL_TREE = 1;

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');
const HARD_DIR = path.join(OUTPUT_DIR, 'hard');

function getNeighbors(r, c, size) {
  return [[-1,0],[1,0],[0,-1],[0,1]]
    .map(([dr,dc]) => [r+dr,c+dc])
    .filter(([nr,nc]) => nr>=0 && nr<size && nc>=0 && nc<size);
}

function isAdjacent(r1,c1,r2,c2) {
  return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2&&c1===c2);
}

function getTentSpots(treeR, treeC, grid, size) {
  return getNeighbors(treeR, treeC, size).filter(([r,c]) => grid[r][c] === CELL_EMPTY);
}

// 检查两个帐篷是否相邻（含对角）
function tentsAdjacent(t1, t2) {
  return isAdjacent(t1[0],t1[1],t2[0],t2[1]);
}

// 检查新帐篷是否与已有帐篷相邻
function hasAdjacentTent(newTent, tents, grid, size) {
  for (const t of tents) {
    if (tentsAdjacent(newTent, t)) return true;
  }
  return false;
}

// 构建一个完整解（树+帐篷布局）
function buildSolution(size, targetTrees) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
  const trees = [];
  const tents = [];

  // 策略1：先放一个"核心簇"——2-3个相邻的树
  // 从随机位置开始
  const tries1 = 100;
  for (let t1 = 0; t1 < tries1; t1++) {
    const r1 = Math.floor(Math.random() * size);
    const c1 = Math.floor(Math.random() * size);
    
    // 放第一个树
    grid[r1][c1] = CELL_TREE;
    trees.push([r1, c1]);

    // 找第一个树的合法帐篷位
    const spots1 = getTentSpots(r1, c1, grid, size);
    if (spots1.length === 0) {
      grid[r1][c1] = CELL_EMPTY;
      trees.pop();
      continue;
    }

    // 放第一个帐篷
    const [tr1, tc1] = spots1[Math.floor(Math.random() * spots1.length)];
    tents.push([tr1, tc1]);
    // 帐篷不能是树位（已满足），但要检查与现有帐篷相邻
    // 第一个帐篷无所谓

    // 放相邻的第二个树（上下左右）
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const adjacent = dirs.map(([dr,dc]) => [r1+dr, c1+dc]).filter(([r,c]) => r>=0&&r<size&&c>=0&&c<size&&grid[r][c]===CELL_EMPTY);
    if (adjacent.length === 0) {
      // 回退
      grid[r1][c1] = CELL_EMPTY;
      tents.pop();
      trees.pop();
      continue;
    }

    // 随机选一个方向扩展
    const [r2, c2] = adjacent[Math.floor(Math.random() * adjacent.length)];
    grid[r2][c2] = CELL_TREE;
    trees.push([r2, c2]);

    // 检查第二个树的帐篷位（不能与第一个帐篷相邻）
    const spots2 = getTentSpots(r2, c2, grid, size).filter(s => !hasAdjacentTent(s, tents, grid, size));
    if (spots2.length === 0) {
      grid[r2][c2] = CELL_EMPTY;
      trees.pop();
      // 回退第一个帐篷，换一个
      tents.pop();
      const spots1b = getTentSpots(r1, c1, grid, size).filter(s => !hasAdjacentTent(s, tents, grid, size));
      if (spots1b.length === 0) {
        grid[r1][c1] = CELL_EMPTY;
        trees.pop();
        continue;
      }
      const [tr1b, tc1b] = spots1b[Math.floor(Math.random() * spots1b.length)];
      tents.push([tr1b, tc1b]);
      // 再试第二个树
      const adjacent2 = dirs.map(([dr,dc]) => [r1+dr,c1+dc]).filter(([r,c]) => r>=0&&r<size&&c>=0&&c<size&&grid[r][c]===CELL_EMPTY);
      if (adjacent2.length === 0) {
        grid[r1][c1] = CELL_EMPTY;
        trees.pop();
        tents.pop();
        continue;
      }
      const [r2b, c2b] = adjacent2[Math.floor(Math.random() * adjacent2.length)];
      grid[r2b][c2b] = CELL_TREE;
      trees.push([r2b, c2b]);
      const spots2b = getTentSpots(r2b, c2b, grid, size).filter(s => !hasAdjacentTent(s, tents, grid, size));
      if (spots2b.length === 0) {
        grid[r2b][c2b] = CELL_EMPTY;
        trees.pop();
        continue;
      }
      const [tr2b, tc2b] = spots2b[Math.floor(Math.random() * spots2b.length)];
      tents.push([tr2b, tc2b]);
    } else {
      const [tr2, tc2] = spots2[Math.floor(Math.random() * spots2.length)];
      tents.push([tr2, tc2]);
    }

    // 核心簇完成（有2个相邻树+各自帐篷）
    break;
  }

  if (trees.length < 2) return null;

  // 策略2：继续填树，但优先选择"受约束"的位置（靠近已有点）
  const maxAttempts = 500;
  for (let attempt = 0; attempt < maxAttempts && trees.length < targetTrees; attempt++) {
    // 找所有空格子，按"靠近已有树"排序
    const candidates = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] !== CELL_EMPTY) continue;
        // 检查是否至少有一个已有树能放帐篷
        const treeNeighbors = trees.filter(([tr,tc]) => isAdjacent(r,c,tr,tc));
        if (treeNeighbors.length === 0) continue;
        // 计算距离最近的树
        let minDist = Infinity;
        for (const [tr,tc] of trees) {
          const d = Math.abs(r-tr) + Math.abs(c-tc);
          if (d < minDist) minDist = d;
        }
        candidates.push([r, c, minDist]);
      }
    }

    if (candidates.length === 0) break;

    candidates.sort((a,b) => a[2] - b[2]);

    // 选一个"近"的候选（不一定最近，增加随机性）
    const topCandidates = candidates.slice(0, Math.min(10, candidates.length));
    const [sr, sc] = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    // 放这个树
    grid[sr][sc] = CELL_TREE;
    trees.push([sr, sc]);

    // 找这个树的合法帐篷位（不能与现有帐篷相邻）
    const spots = getTentSpots(sr, sc, grid, size).filter(s => !hasAdjacentTent(s, tents, grid, size));
    if (spots.length === 0) {
      // 无法为这个树放帐篷，回退
      grid[sr][sc] = CELL_EMPTY;
      trees.pop();
    } else {
      // 放帐篷
      const [tr, tc] = spots[Math.floor(Math.random() * spots.length)];
      tents.push([tr, tc]);
    }
  }

  if (trees.length < 4) return null;

  return { grid, trees, tents };
}

// 验证谜题是否唯一解
function countSolutions(puzzleGrid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (puzzleGrid[r][c] === CELL_TREE) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return { count: 0, solution: null };

  const tentPlacements = trees.map(([tr, tc]) =>
    getNeighbors(tr, tc, size).filter(([nr, nc]) => puzzleGrid[nr][nc] === CELL_EMPTY)
  );

  if (tentPlacements.some(p => p.length === 0)) return { count: 0, solution: null };

  let solutionCount = 0;
  let oneSolution = null;

  function backtrack(treeIndex, placedTents) {
    if (solutionCount >= maxCount) return;
    if (treeIndex === trees.length) {
      solutionCount++;
      if (!oneSolution) oneSolution = new Set(placedTents);
      return;
    }
    for (const [tr, tc] of tentPlacements[treeIndex]) {
      if (placedTents.has(`${tr},${tc}`)) continue;
      let adjacent = false;
      for (const [nr, nc] of getNeighbors(tr, tc, size)) {
        if (placedTents.has(`${nr},${nc}`)) { adjacent = true; break; }
      }
      if (adjacent) continue;
      placedTents.add(`${tr},${tc}`);
      backtrack(treeIndex + 1, placedTents);
      placedTents.delete(`${tr},${tc}`);
      if (solutionCount >= maxCount) return;
    }
  }

  backtrack(0, new Set());
  return { count: solutionCount, solution: oneSolution };
}

// 生成一道唯一解谜题
function generateOneHard(maxAttempts = 10000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 目标树数量：hard 10x10，10-16棵树
    const targetTrees = 10 + Math.floor(Math.random() * 7);
    const sol = buildSolution(10, targetTrees);
    if (!sol || sol.trees.length < 4) continue;

    // 移除帐篷，构建谜题
    const puzzleGrid = Array(10).fill(null).map(() => Array(10).fill(CELL_EMPTY));
    for (const [tr, tc] of sol.trees) {
      puzzleGrid[tr][tc] = CELL_TREE;
    }

    const result = countSolutions(puzzleGrid, 10, 2);
    if (result.count === 1) {
      const tentsObj = {};
      for (const pos of result.solution) {
        tentsObj[pos] = true;
      }
      return {
        grid: puzzleGrid,
        tents: tentsObj,
        treeCount: sol.trees.length,
        solution: Array.from(result.solution)
      };
    }
  }
  return null;
}

// 主函数：生成N道题
function main() {
  const target = 1000;
  const batch = 50;
  let generated = 0;
  let totalAttempts = 0;
  const startTime = Date.now();

  // 先检查已有文件
  let existing = [];
  try {
    existing = fs.readdirSync(HARD_DIR).filter(f => f.endsWith('.json'));
  } catch (e) {
    fs.mkdirSync(HARD_DIR, { recursive: true });
  }

  console.log(`生成 Tents hard 10x10 (v13: 逆向构建)...`);
  console.log(`已有 ${existing.length} 个文件，目标 ${target}`);

  let batchNum = 0;
  while (generated < target) {
    const toGenerate = Math.min(batch, target - generated);
    const batchStart = generated + 1;

    console.log(`\n批次 ${batchNum + 1}: 生成第 ${batchStart}-${batchStart + toGenerate - 1} 题...`);

    for (let i = 0; i < toGenerate; i++) {
      const id = String(batchStart + i).padStart(4, '0');
      const result = generateOneHard(20000);
      totalAttempts++;

      if (result) {
        const data = {
          id: `hard-${id}`,
          difficulty: 'hard',
          size: 10,
          grid: result.grid,
          tents: result.tents,
          treeCount: result.treeCount,
          unique: true
        };
        fs.writeFileSync(path.join(HARD_DIR, `hard-${id}.json`), JSON.stringify(data));
        generated++;
        console.log(`  ✓ hard-${id} (树=${result.treeCount})`);
      }

      if ((totalAttempts) % 500 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  进度: ${generated}/${target}, 尝试: ${totalAttempts}, 耗时: ${elapsed}s`);
      }
    }
    batchNum++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n完成! 生成了 ${generated}/${target} 题，共尝试 ${totalAttempts} 次，耗时 ${elapsed}s`);
  console.log(`成功率: ${(generated/totalAttempts*100).toFixed(2)}%`);
}

main();