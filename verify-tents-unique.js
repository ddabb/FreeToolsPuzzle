/**
 * 验证帐篷谜题唯一解率（不带行列约束，模拟前端无行列提示的情况）
 */
const fs = require('fs');
const path = require('path');

function isAdj(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2&&c1===c2); }
function getNeighbors(r, c, size) { return [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc])=>[r+dr,c+dc]).filter(([nr,nc])=>nr>=0&&nr<size&&nc>=0&&nc<size); }

// 不带行列约束的求解器
function countSolutionsNoHints(grid, size, maxCount) {
  const trees = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 1) trees.push([r, c]);
  const n = trees.length;
  if (!n) return 0;
  const opts = trees.map(([tr, tc]) => getNeighbors(tr, tc, size).filter(([r, c]) => grid[r][c] !== 1));
  if (opts.some(p => p.length === 0)) return 0;

  const asgn = Array(n).fill(null);
  let cnt = 0;

  function bt(idx) {
    if (idx === n) { cnt++; return cnt >= maxCount; }
    for (const [tr, tc] of opts[idx]) {
      let occ = false; for (let j = 0; j < idx; j++) if (asgn[j][0]===tr && asgn[j][1]===tc) { occ=true; break; }
      if (occ) continue;
      let adj = false; for (let j = 0; j < idx; j++) if (isAdj(tr, tc, asgn[j][0], asgn[j][1])) { adj=true; break; }
      if (adj) continue;
      asgn[idx] = [tr, tc];
      if (bt(idx + 1)) return true;
      asgn[idx] = null;
    }
    return false;
  }

  bt(0);
  return cnt;
}

// 带1:1约束 + 行列约束（完整版）
function countSolutionsFull(grid, size, maxCount, rowCounts, colCounts) {
  const trees = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 1) trees.push([r, c]);
  const n = trees.length;
  if (!n) return 0;
  const opts = trees.map(([tr, tc]) => getNeighbors(tr, tc, size).filter(([r, c]) => grid[r][c] !== 1));
  if (opts.some(p => p.length === 0)) return 0;

  const asgn = Array(n).fill(null);
  const rowTents = Array(size).fill(0);
  const colTents = Array(size).fill(0);
  let cnt = 0;

  function bt(idx) {
    if (idx === n) {
      if (rowCounts && colCounts) {
        for (let r = 0; r < size; r++) if (rowTents[r] !== rowCounts[r]) return false;
        for (let c = 0; c < size; c++) if (colTents[c] !== colCounts[c]) return false;
      }
      cnt++;
      return cnt >= maxCount;
    }
    for (const [tr, tc] of opts[idx]) {
      let occ = false; for (let j = 0; j < idx; j++) if (asgn[j][0]===tr && asgn[j][1]===tc) { occ=true; break; }
      if (occ) continue;
      let adj = false; for (let j = 0; j < idx; j++) if (isAdj(tr, tc, asgn[j][0], asgn[j][1])) { adj=true; break; }
      if (adj) continue;
      // 1:1: 帐篷只紧邻当前树
      let nearOther = false; for (let t = 0; t < n; t++) { if (t===idx) continue; if (isAdj(tr, tc, trees[t][0], trees[t][1])) { nearOther=true; break; } }
      if (nearOther) continue;
      if (rowCounts && colCounts) {
        if (rowTents[tr]+1 > rowCounts[tr]) continue;
        if (colTents[tc]+1 > colCounts[tc]) continue;
      }
      asgn[idx] = [tr, tc]; rowTents[tr]++; colTents[tc]++;
      if (bt(idx + 1)) { rowTents[tr]--; colTents[tc]--; return true; }
      rowTents[tr]--; colTents[tc]--;
    }
    return false;
  }

  bt(0);
  return cnt;
}

for (const diff of ['easy', 'medium', 'hard']) {
  const dir = path.join('F:/SelfJob/FreeToolsPuzzle/data/tents', diff);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let noHints_single = 0, noHints_multi = 0;
  let full_single = 0, full_multi = 0;
  const sample = files.slice(0, 100);

  for (const fn of sample) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf8'));

    // 不带任何约束（最宽松：帐篷不相邻即可）
    const c1 = countSolutionsNoHints(d.grid, d.size, 2);
    if (c1 === 1) noHints_single++; else noHints_multi++;

    // 带完整约束（1:1 + 行列提示）
    const c2 = countSolutionsFull(d.grid, d.size, 2, d.rowCounts, d.colCounts);
    if (c2 === 1) full_single++; else full_multi++;
  }

  const total = sample.length;
  console.log(`${diff} (${total}题):`);
  console.log(`  无约束唯一解率: ${(noHints_single/total*100).toFixed(1)}% (${noHints_single}/${total})`);
  console.log(`  完整约束唯一解率: ${(full_single/total*100).toFixed(1)}% (${full_single}/${total})`);
}
