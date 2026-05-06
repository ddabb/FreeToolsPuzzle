/**
 * Tents v15 - 高密度约束版
 * 
 * vs v14: 大幅增加树/帐篷数量，提升唯一解率
 * 
 * v14: easy [4-6] 86% | medium [7-9] 75% | hard [10-13] 68%
 * v15: easy [7-9]     | medium [11-15]    | hard [16-22]
 * 
 * 树间距≥2 保留（1:1严格），更密树→更多约束→更高唯一解率
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');
const SIZES = { easy: 6, medium: 8, hard: 10 };
const TREE_COUNTS = { easy: [7, 9], medium: [11, 15], hard: [16, 22] };
const COUNTS = { easy: 1000, medium: 1000, hard: 1000 };

function isAdj(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2&&c1===c2); }
function getNeighbors(r, c, size) { return [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nr<size&&nc>=0&&nc<size); }
function hasAdjTent(pos, tents) { for (const t of tents) if (isAdj(pos[0],pos[1],t[0],t[1])) return true; return false; }

function buildSolution(size, targetTrees) {
  const grid = Array.from({length: size}, () => Array(size).fill(0));
  const trees = [], tents = [];

  for (let pair = 0; pair < targetTrees; pair++) {
    let placed = false;
    for (let att = 0; att < 800; att++) {
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

  if (trees.length < 4) return null;

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

  // 按选项数排序（MRV启发式）
  const order = trees.map((_, i) => i).sort((a, b) => opts[a].length - opts[b].length);
  const revOrder = new Array(n);
  order.forEach((orig, sorted) => revOrder[orig] = sorted);

  const asgn = Array(n).fill(null);
  const rowTents = Array(size).fill(0);
  const colTents = Array(size).fill(0);
  let cnt = 0, firstSol = null;

  function bt(sortedIdx) {
    if (sortedIdx === n) {
      if (rowCounts && colCounts) {
        for (let r = 0; r < size; r++) if (rowTents[r] !== rowCounts[r]) return false;
        for (let c = 0; c < size; c++) if (colTents[c] !== colCounts[c]) return false;
      }
      cnt++;
      if (!firstSol) firstSol = order.map((origIdx, si) => asgn[si] ? [asgn[si][0], asgn[si][1]] : null);
      return cnt >= maxCount;
    }
    const origIdx = order[sortedIdx];
    for (const [tr, tc] of opts[origIdx]) {
      // 不重复
      let occ = false; for (let j = 0; j < sortedIdx; j++) if (asgn[j][0]===tr && asgn[j][1]===tc) { occ=true; break; }
      if (occ) continue;
      // 帐篷不相邻
      let adj = false; for (let j = 0; j < sortedIdx; j++) if (isAdj(tr, tc, asgn[j][0], asgn[j][1])) { adj=true; break; }
      if (adj) continue;
      // 1:1: 帐篷只紧邻当前树
      let nearOther = false; for (let t = 0; t < n; t++) { if (t===origIdx) continue; if (isAdj(tr, tc, trees[t][0], trees[t][1])) { nearOther=true; break; } }
      if (nearOther) continue;
      // 行列提前剪枝
      if (rowCounts && colCounts) {
        if (rowTents[tr]+1 > rowCounts[tr]) continue;
        if (colTents[tc]+1 > colCounts[tc]) continue;
      }
      asgn[sortedIdx] = [tr, tc]; rowTents[tr]++; colTents[tc]++;
      if (bt(sortedIdx+1)) { rowTents[tr]--; colTents[tc]--; return true; }
      rowTents[tr]--; colTents[tc]--;
    }
    return false;
  }

  bt(0);

  // 重建 solution 按 trees 原始顺序
  let solution = null;
  if (firstSol) {
    solution = new Array(n);
    order.forEach((origIdx, sortedIdx) => { solution[origIdx] = firstSol[sortedIdx]; });
  }

  return { count: cnt, solution };
}

function generatePuzzle(difficulty) {
  const size = SIZES[difficulty];
  const [minT, maxT] = TREE_COUNTS[difficulty];
  const targetTrees = minT + Math.floor(Math.random() * (maxT - minT + 1));

  for (let attempt = 0; attempt < 200; attempt++) {
    const sol = buildSolution(size, targetTrees);
    if (!sol) continue;

    const result = countSolutions1to1(sol.grid, size, 2, sol.rowCounts, sol.colCounts);
    if (result.count !== 1) continue;

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

function main() {
  const stats = {};
  for (const diff of ['easy', 'medium', 'hard']) {
    console.log(`\n=== 生成 ${diff} (${SIZES[diff]}×${SIZES[diff]}, 树${TREE_COUNTS[diff][0]}-${TREE_COUNTS[diff][1]}) ===`);
    const outDir = path.join(OUTPUT_DIR, diff);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let success = 0, fail = 0;
    const startTime = Date.now();
    const treeHist = {};

    while (success < COUNTS[diff]) {
      const puzzle = generatePuzzle(diff);
      if (puzzle) {
        success++;
        const id = String(success).padStart(4, '0');
        puzzle.id = diff + '-' + id;
        puzzle.difficulty = diff;
        fs.writeFileSync(path.join(outDir, diff + '-' + id + '.json'), JSON.stringify(puzzle));
        treeHist[puzzle.treeCount] = (treeHist[puzzle.treeCount] || 0) + 1;
      } else {
        fail++;
      }
      if ((success + fail) % 100 === 0) {
        console.log(`  ${success}/${COUNTS[diff]} (失败 ${fail})`);
      }
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ ${diff}: ${success}题 (${elapsed}s, 失败${fail})`);
    console.log(`  树数量分布: ${JSON.stringify(treeHist)}`);
    stats[diff] = { success, fail, elapsed, treeHist };
  }
  console.log('\n=== 汇总 ===');
  for (const [d, s] of Object.entries(stats)) {
    console.log(`${d}: ${s.success}题 / ${s.fail}失败 / ${s.elapsed}s`);
  }
}

main();
