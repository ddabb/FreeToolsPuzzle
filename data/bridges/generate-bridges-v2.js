/**
 * 桥 (Hashiwokakero) 题库生成器 v2
 * 
 * 修复：
 * - 严格禁止桥交叉
 * - 答案由求解器生成，保证有解且唯一
 * - 岛数字从答案反推，确保一致
 */

const fs = require('fs');
const path = require('path');

const CONFIGS = {
  easy:   { rows: 7, cols: 7,  minIslands: 5, maxIslands: 9 },
  medium: { rows: 10, cols: 10, minIslands: 8, maxIslands: 16 },
  hard:   { rows: 13, cols: 13, minIslands: 12, maxIslands: 24 }
};

const COUNT_PER_DIFFICULTY = 1000;

/**
 * 检查两岛之间是否可以连桥（同行/同列，中间无岛阻挡）
 */
function canConnect(islands, i, j) {
  const a = islands[i], b = islands[j];
  if (a.r === b.r) {
    const cMin = Math.min(a.c, b.c), cMax = Math.max(a.c, b.c);
    for (let k = 0; k < islands.length; k++) {
      if (k !== i && k !== j && islands[k].r === a.r && islands[k].c > cMin && islands[k].c < cMax) return false;
    }
    return true;
  }
  if (a.c === b.c) {
    const rMin = Math.min(a.r, b.r), rMax = Math.max(a.r, b.r);
    for (let k = 0; k < islands.length; k++) {
      if (k !== i && k !== j && islands[k].c === a.c && islands[k].r > rMin && islands[k].r < rMax) return false;
    }
    return true;
  }
  return false;
}

/**
 * 检查两座桥是否交叉
 */
function bridgesCross(hb, vb) {
  const hRow = hb.r1;
  const hCMin = Math.min(hb.c1, hb.c2);
  const hCMax = Math.max(hb.c1, hb.c2);
  const vCol = vb.c1;
  const vRMin = Math.min(vb.r1, vb.r2);
  const vRMax = Math.max(vb.r1, vb.r2);
  return (vCol > hCMin && vCol < hCMax && hRow > vRMin && hRow < vRMax);
}

/**
 * 生成一道桥题（带唯一解验证）
 */
function generatePuzzle(config) {
  const { rows, cols, minIslands, maxIslands } = config;
  const numIslands = minIslands + Math.floor(Math.random() * (maxIslands - minIslands + 1));

  // 随机放置岛屿，确保不相邻
  const islands = [];
  const occupied = new Set();
  let attempts = 0;

  while (islands.length < numIslands && attempts < 1000) {
    attempts++;
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = r * cols + c;
    if (occupied.has(key)) continue;
    let hasNeighbor = false;
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      if (occupied.has((r+dr) * cols + (c+dc))) { hasNeighbor = true; break; }
    }
    if (hasNeighbor) continue;
    islands.push({ r, c });
    occupied.add(key);
  }

  if (islands.length < 3) return null;

  const n = islands.length;

  // 构建所有可能的边
  const candidates = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (canConnect(islands, i, j)) {
        candidates.push({ i, j });
      }
    }
  }

  if (candidates.length < n - 1) return null;

  const answer = solveWithAnswer(islands, candidates);
  if (!answer) return null;

  const outIslands = islands.map((isl, idx) => ({
    r: isl.r, c: isl.c, n: answer.islandDegrees[idx]
  }));

  const outAnswer = [];
  for (let e = 0; e < candidates.length; e++) {
    if (answer.bridgeCounts[e] > 0) {
      const { i, j } = candidates[e];
      outAnswer.push({
        r1: islands[i].r, c1: islands[i].c,
        r2: islands[j].r, c2: islands[j].c,
        count: answer.bridgeCounts[e]
      });
    }
  }

  return { rows, cols, islands: outIslands, answer: outAnswer };
}

/**
 * 核心求解器：找到一个有效桥配置并验证唯一解
 */
function solveWithAnswer(islands, candidates) {
  const n = islands.length;
  const E = candidates.length;
  const edgeEnds = candidates.map(e => ({ i: e.i, j: e.j }));

  // 预计算几何信息
  const edgeGeo = candidates.map(e => {
    const ai = islands[e.i], aj = islands[e.j];
    return { isH: ai.r === aj.r, r: ai.r, c: ai.c, r2: aj.r, c2: aj.c };
  });

  function edgesCross(e1, e2) {
    const g1 = edgeGeo[e1], g2 = edgeGeo[e2];
    if (g1.isH === g2.isH) return false;
    const hg = g1.isH ? g1 : g2;
    const vg = g1.isH ? g2 : g1;
    const hRow = hg.r;
    const hCMin = Math.min(hg.c, hg.c2);
    const hCMax = Math.max(hg.c, hg.c2);
    const vCol = vg.c;
    const vRMin = Math.min(vg.r, vg.r2);
    const vRMax = Math.max(vg.r, vg.r2);
    return (vCol > hCMin && vCol < hCMax && hRow > vRMin && hRow < vRMax);
  }

  function getDegree(bridgeCounts, idx) {
    let deg = 0;
    for (let e = 0; e < E; e++) {
      if (bridgeCounts[e] > 0) {
        if (edgeEnds[e].i === idx || edgeEnds[e].j === idx) deg += bridgeCounts[e];
      }
    }
    return deg;
  }

  function isConnected(bridgeCounts) {
    const visited = new Set([0]);
    const queue = [0];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (let e = 0; e < E; e++) {
        if (bridgeCounts[e] === 0) continue;
        let neighbor = -1;
        if (edgeEnds[e].i === cur) neighbor = edgeEnds[e].j;
        else if (edgeEnds[e].j === cur) neighbor = edgeEnds[e].i;
        if (neighbor >= 0 && !visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
      }
    }
    return visited.size === n;
  }

  let solutionFound = null;
  let hasSecondSolution = false;
  const MAX_DEGREE = 8;

  function backtrack(eIdx, bridgeCounts) {
    if (hasSecondSolution) return;

    if (eIdx === E) {
      if (!isConnected(bridgeCounts)) return;
      if (!solutionFound) {
        solutionFound = [...bridgeCounts];
      } else {
        hasSecondSolution = true;
      }
      return;
    }

    const { i, j } = edgeEnds[eIdx];
    const iDeg = getDegree(bridgeCounts, i);
    const jDeg = getDegree(bridgeCounts, j);

    for (let count = 0; count <= 2; count++) {
      if (hasSecondSolution) return;
      if (iDeg + count > MAX_DEGREE || jDeg + count > MAX_DEGREE) continue;

      // 交叉检测
      if (count > 0) {
        let cross = false;
        for (let e2 = 0; e2 < eIdx; e2++) {
          if (bridgeCounts[e2] > 0 && edgesCross(eIdx, e2)) { cross = true; break; }
        }
        if (cross) continue;
      }

      bridgeCounts[eIdx] = count;
      backtrack(eIdx + 1, bridgeCounts);
      bridgeCounts[eIdx] = 0;
    }
  }

  const initialCounts = new Array(E).fill(0);
  backtrack(0, initialCounts);

  if (!solutionFound || hasSecondSolution) return null;

  const islandDegrees = [];
  for (let i = 0; i < n; i++) {
    islandDegrees.push(getDegree(solutionFound, i));
  }

  const maxDegree = Math.max(...islandDegrees);
  if (maxDegree < 2) return null;

  return { bridgeCounts: solutionFound, islandDegrees };
}

// ===== 主程序 =====

const args = process.argv.slice(2);
const difficulty = args[0] || 'easy';
const config = CONFIGS[difficulty];

if (!config) {
  console.error('Usage: node generate-bridges-v2.js [easy|medium|hard]');
  process.exit(1);
}

const outDir = path.join(__dirname, difficulty);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 清空旧文件
const oldFiles = fs.readdirSync(outDir).filter(f => f.startsWith(difficulty + '-') && f.endsWith('.json'));
for (const f of oldFiles) fs.unlinkSync(path.join(outDir, f));

let generated = 0;
let failed = 0;
const startTime = Date.now();

while (generated < COUNT_PER_DIFFICULTY) {
  const puzzle = generatePuzzle(config);
  if (!puzzle) { failed++; continue; }

  generated++;
  const filename = difficulty + '-' + String(generated).padStart(4, '0') + '.json';
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(puzzle));

  if (generated % 50 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${difficulty}] ${generated}/${COUNT_PER_DIFFICULTY} (${elapsed}s, ${failed}失败)`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ ${difficulty} 完成: ${generated}题, ${failed}次失败, 耗时${elapsed}s`);

// 抽检前3题
console.log('\n--- 抽检 ---');
for (let i = 1; i <= Math.min(3, generated); i++) {
  const fn = difficulty + '-' + String(i).padStart(4, '0') + '.json';
  const p = JSON.parse(fs.readFileSync(path.join(outDir, fn), 'utf-8'));
  let crossError = false;
  for (let a = 0; a < p.answer.length && !crossError; a++) {
    for (let b = a + 1; b < p.answer.length && !crossError; b++) {
      if (bridgesCross(p.answer[a], p.answer[b])) {
        console.log(`❌ ${fn}: 桥交叉! answer[${a}] × answer[${b}]`);
        crossError = true;
      }
    }
  }
  if (!crossError) {
    console.log(`✅ ${fn}: ${p.islands.length}岛, ${p.answer.length}桥, 无交叉`);
  }
}
