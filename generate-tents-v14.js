/**
 * Tents v14 - 1:1严格版 + 行列提示
 * 
 * 核心改进（vs v13）：
 * 1. 树间距≥2 → 帐篷只紧邻自己的树（1:1严格对应）
 * 2. 行列提示 → 唯一解率从0%提升到~70-85%
 * 3. 求解器强制1:1约束：帐篷只紧邻所属树
 * 
 * 规则：
 * - 每棵树恰好1个帐篷，帐篷紧邻树（上下左右）
 * - 帐篷之间不能相邻（含对角）
 * - 每个帐篷只能紧邻1棵树（1:1严格对应）
 * - 行列数字提示帐篷数量
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');
const SIZES = { easy: 6, medium: 8, hard: 10 };
const TREE_COUNTS = { easy: [4, 6], medium: [7, 9], hard: [10, 13] };
const COUNTS = { easy: 1000, medium: 1000, hard: 1000 };

function isAdj(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2&&c1===c2); }
function getNeighbors(r, c, size) { return [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nr<size&&nc>=0&&nc<size); }
function hasAdjTent(nt, tents) { for (const t of tents) if (isAdj(nt[0],nt[1],t[0],t[1])) return true; return false; }

function buildSolution(size, targetTrees) {
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  const trees = [], tents = [];

  for (let pair = 0; pair < targetTrees; pair++) {
    let placed = false;
    for (let att = 0; att < 500; att++) {
      const sr = Math.floor(Math.random() * size);
      const sc = Math.floor(Math.random() * size);
      if (grid[sr][sc] !== 0) continue;

      // 树间距≥2（切比雪夫距离）
      let tooClose = false;
      for (const [tr, tc] of trees) {
        if (Math.max(Math.abs(sr - tr), Math.abs(sc - tc)) < 2) { tooClose = true; break; }
      }
      if (tooClose) continue;

      // 树不紧邻已有帐篷
      let treeNearTent = false;
      for (const t of tents) { if (isAdj(sr, sc, t[0], t[1])) { treeNearTent = true; break; } }
      if (treeNearTent) continue;

      grid[sr][sc] = 1;

      // 找独占帐篷位（只紧邻当前树，不紧邻其他树，不与已有帐篷相邻）
      const spots = getNeighbors(sr, sc, size).filter(([r, c]) => {
        if (grid[r][c] !== 0) return false;
        if (hasAdjTent([r, c], tents)) return false;
        for (const [tr, tc] of trees) { if (isAdj(r, c, tr, tc)) return false; }
        return true;
      });

      if (spots.length === 0) { grid[sr][sc] = 0; continue; }

      const chosen = spots[Math.floor(Math.random() * spots.length)];
      trees.push([sr, sc]);
      tents.push(chosen);
      placed = true;
      break;
    }
    if (!placed) break;
  }

  if (trees.length < 3) return null;

  // 计算行列提示
  const rowCounts = Array(size).fill(0);
  const colCounts = Array(size).fill(0);
  for (const [r, c] of tents) { rowCounts[r]++; colCounts[c]++; }

  return { grid, trees, tents, rowCounts, colCounts };
}

// 1:1求解器 + 行列约束
function countSolutions1to1(grid, size, maxCount, rowCounts, colCounts) {
  const trees = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 1) trees.push([r, c]);
  if (!trees.length) return { count: 0 };
  const n = trees.length;
  const opts = trees.map(([tr, tc]) => getNeighbors(tr, tc, size).filter(([r, c]) => grid[r][c] !== 1));
  if (opts.some(p => p.length === 0)) return { count: 0 };

  const asgn = Array(n).fill(null);
  const rowTents = Array(size).fill(0);
  const colTents = Array(size).fill(0);
  let cnt = 0, firstSol = null;

  function bt(idx) {
    if (idx === n) {
      if (rowCounts && colCounts) {
        for (let r = 0; r < size; r++) if (rowTents[r] !== rowCounts[r]) return false;
        for (let c = 0; c < size; c++) if (colTents[c] !== colCounts[c]) return false;
      }
      cnt++;
      if (!firstSol) firstSol = asgn.map(a => [a[0], a[1]]);
      return cnt >= maxCount;
    }
    for (const [tr, tc] of opts[idx]) {
      // 不重复
      let occ = false; for (let j = 0; j < idx; j++) if (asgn[j][0]===tr && asgn[j][1]===tc) { occ=true; break; }
      if (occ) continue;
      // 帐篷不相邻
      let adj = false; for (let j = 0; j < idx; j++) if (isAdj(tr, tc, asgn[j][0], asgn[j][1])) { adj=true; break; }
      if (adj) continue;
      // 1:1: 帐篷只紧邻当前树
      let nearOther = false; for (let t = 0; t < n; t++) { if (t===idx) continue; if (isAdj(tr, tc, trees[t][0], trees[t][1])) { nearOther=true; break; } }
      if (nearOther) continue;
      // 行列提前剪枝
      if (rowCounts && colCounts) {
        if (rowTents[tr]+1 > rowCounts[tr]) continue;
        if (colTents[tc]+1 > colCounts[tc]) continue;
      }
      asgn[idx] = [tr, tc]; rowTents[tr]++; colTents[tc]++;
      if (bt(idx+1)) { rowTents[tr]--; colTents[tc]--; return true; }
      rowTents[tr]--; colTents[tc]--;
    }
    return false;
  }

  bt(0);
  return { count: cnt, solution: firstSol };
}

// 生成一道谜题
function generatePuzzle(difficulty) {
  const size = SIZES[difficulty];
  const [minT, maxT] = TREE_COUNTS[difficulty];
  const targetTrees = minT + Math.floor(Math.random() * (maxT - minT + 1));

  for (let attempt = 0; attempt < 100; attempt++) {
    const sol = buildSolution(size, targetTrees);
    if (!sol) continue;

    // 验证唯一解（含1:1 + 行列约束）
    const result = countSolutions1to1(sol.grid, size, 2, sol.rowCounts, sol.colCounts);
    if (result.count !== 1) continue;

    // 构建谜题数据
    const tentsObj = {};
    sol.tents.forEach(([r, c]) => { tentsObj[r + ',' + c] = true; });

    return {
      grid: sol.grid,
      size,
      tents: tentsObj,
      treeCount: sol.trees.length,
      rowCounts: sol.rowCounts,
      colCounts: sol.colCounts,
      unique: true
    };
  }
  return null;
}

// 主流程
function main() {
  for (const diff of ['easy', 'medium', 'hard']) {
    console.log(`\n=== 生成 ${diff} (${SIZES[diff]}×${SIZES[diff]}) ===`);
    const outDir = path.join(OUTPUT_DIR, diff);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let success = 0, fail = 0;
    const startTime = Date.now();

    while (success < COUNTS[diff]) {
      const puzzle = generatePuzzle(diff);
      if (puzzle) {
        success++;
        const id = String(success).padStart(4, '0');
        puzzle.id = diff + '-' + id;
        puzzle.difficulty = diff;
        fs.writeFileSync(path.join(outDir, diff + '-' + id + '.json'), JSON.stringify(puzzle));
      } else {
        fail++;
      }
      if ((success + fail) % 100 === 0) {
        console.log(`  ${success}/${COUNTS[diff]} (失败 ${fail})`);
      }
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ ${diff}: ${success}题 (${elapsed}s, 失败${fail})`);
  }
}

main();
