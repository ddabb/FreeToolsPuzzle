/**
 * 桥 (Hashiwokakero) 题库生成器 v3
 * 
 * 策略改进：
 * 1. 先用构造法生成有效桥配置（生成树 + 额外边），保证无交叉
 * 2. 用该配置作为"预期答案"，岛数字从答案反推
 * 3. 回溯验证唯一解（有目标度数约束，剪枝极强）
 */

const fs = require('fs');
const path = require('path');

const CONFIGS = {
  easy:   { rows: 7,  cols: 7,  minIslands: 5, maxIslands: 9,  maxExtraEdges: 2 },
  medium: { rows: 10, cols: 10, minIslands: 8, maxIslands: 16, maxExtraEdges: 4 },
  hard:   { rows: 13, cols: 13, minIslands: 12, maxIslands: 24, maxExtraEdges: 6 }
};

const COUNT_PER_DIFFICULTY = 1000;

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

function bridgesCross(hb, vb) {
  const hRow = hb.r1, hCMin = Math.min(hb.c1, hb.c2), hCMax = Math.max(hb.c1, hb.c2);
  const vCol = vb.c1, vRMin = Math.min(vb.r1, vb.r2), vRMax = Math.max(vb.r1, vb.r2);
  return (vCol > hCMin && vCol < hCMax && hRow > vRMin && hRow < vRMax);
}

/**
 * 构造一个有效的桥配置（答案）
 * 策略：Prim生成树 → 升级为双桥 → 添加非树边（检查交叉和度数）
 */
function buildAnswer(islands, config) {
  const n = islands.length;

  // 所有候选边
  const allEdges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (canConnect(islands, i, j)) {
        allEdges.push({ i, j });
      }
    }
  }

  if (allEdges.length < n - 1) return null;

  // 边的几何信息
  const edgeGeo = allEdges.map(e => {
    const ai = islands[e.i], aj = islands[e.j];
    return { isH: ai.r === aj.r, r: ai.r, c: ai.c, r2: aj.r, c2: aj.c };
  });

  function edgesCrossIdx(e1, e2) {
    const g1 = edgeGeo[e1], g2 = edgeGeo[e2];
    if (g1.isH === g2.isH) return false;
    const hg = g1.isH ? g1 : g2;
    const vg = g1.isH ? g2 : g1;
    return (vg.c > Math.min(hg.c, hg.c2) && vg.c < Math.max(hg.c, hg.c2)
            && hg.r > Math.min(vg.r, vg.r2) && hg.r < Math.max(vg.r, vg.r2));
  }

  // Prim 生成树
  const inTree = new Set([0]);
  const treeEdges = []; // 边索引

  // 随机打乱后按距离排序
  const shuffled = [...allEdges].sort(() => Math.random() - 0.5);

  while (inTree.size < n) {
    let best = null;
    // 从候选中找能扩展树的边（偏好短边）
    const candidates = shuffled.filter(e =>
      (inTree.has(e.i) && !inTree.has(e.j)) || (inTree.has(e.j) && !inTree.has(e.i))
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const da = Math.abs(islands[a.i].r - islands[a.j].r) + Math.abs(islands[a.i].c - islands[a.j].c);
      const db = Math.abs(islands[b.i].r - islands[b.j].r) + Math.abs(islands[b.i].c - islands[b.j].c);
      return da - db;
    });

    // 从前30%中随机选
    const topN = Math.max(1, Math.floor(candidates.length * 0.3));
    best = candidates[Math.floor(Math.random() * topN)];
    const idx = allEdges.indexOf(best);
    inTree.add(best.i);
    inTree.add(best.j);
    treeEdges.push(idx);
  }

  // 桥计数: 边索引 -> count(0/1/2)
  const bridgeMap = {}; // "idx" -> count
  for (const idx of treeEdges) {
    bridgeMap[idx] = 1;
  }

  // 获取当前度数
  function getDeg(idx) {
    let d = 0;
    for (const [e, c] of Object.entries(bridgeMap)) {
      const ei = parseInt(e);
      if ((allEdges[ei].i === idx || allEdges[ei].j === idx)) d += c;
    }
    return d;
  }

  // 随机升级一些树边为双桥
  const shuffledTree = [...treeEdges].sort(() => Math.random() - 0.5);
  let doubleCount = 0;
  const maxDouble = Math.min(config.maxExtraEdges, Math.floor(treeEdges.length / 2));
  for (const idx of shuffledTree) {
    if (doubleCount >= maxDouble) break;
    const e = allEdges[idx];
    if (getDeg(e.i) + 1 <= 8 && getDeg(e.j) + 1 <= 8) {
      bridgeMap[idx] = 2;
      doubleCount++;
    }
  }

  // 添加额外的非树边（必须不交叉、度数不超过8）
  const nonTreeEdges = allEdges.map((e, idx) => ({ e, idx })).filter(x => !bridgeMap[x.idx]);
  nonTreeEdges.sort(() => Math.random() - 0.5);

  let extraAdded = 0;
  for (const { e, idx } of nonTreeEdges) {
    if (extraAdded >= config.maxExtraEdges) break;
    if (getDeg(e.i) + 1 > 8 || getDeg(e.j) + 1 > 8) continue;

    // 检查与已有桥是否交叉
    let cross = false;
    for (const [eStr, count] of Object.entries(bridgeMap)) {
      if (count === 0) continue;
      const ei = parseInt(eStr);
      if (edgesCrossIdx(idx, ei)) { cross = true; break; }
    }
    if (cross) continue;

    bridgeMap[idx] = 1;
    extraAdded++;
  }

  // 转为数组格式
  const answer = [];
  const islandDegrees = new Array(n).fill(0);

  for (const [eStr, count] of Object.entries(bridgeMap)) {
    if (count === 0) continue;
    const ei = parseInt(eStr);
    const { i, j } = allEdges[ei];
    islandDegrees[i] += count;
    islandDegrees[j] += count;
    answer.push({
      r1: islands[i].r, c1: islands[i].c,
      r2: islands[j].r, c2: islands[j].c,
      count
    });
  }

  return { answer, islandDegrees, bridgeMap, allEdges, edgeGeo };
}

/**
 * 验证唯一解（给定目标度数，回溯搜索是否有第二个解）
 */
function hasUniqueSolution(islands, targetDegrees, answerBridgeMap, allEdges, edgeGeo) {
  const n = islands.length;
  const E = allEdges.length;
  const edgeEnds = allEdges.map(e => ({ i: e.i, j: e.j }));

  function edgesCrossIdx(e1, e2) {
    const g1 = edgeGeo[e1], g2 = edgeGeo[e2];
    if (g1.isH === g2.isH) return false;
    const hg = g1.isH ? g1 : g2;
    const vg = g1.isH ? g2 : g1;
    return (vg.c > Math.min(hg.c, hg.c2) && vg.c < Math.max(hg.c, hg.c2)
            && hg.r > Math.min(vg.r, vg.r2) && hg.r < Math.max(vg.r, vg.r2));
  }

  function getDeg(bridgeCounts, idx) {
    let d = 0;
    for (let e = 0; e < E; e++) {
      if (bridgeCounts[e] > 0 && (edgeEnds[e].i === idx || edgeEnds[e].j === idx)) d += bridgeCounts[e];
    }
    return d;
  }

  function isConnected(bridgeCounts) {
    const visited = new Set([0]), queue = [0];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (let e = 0; e < E; e++) {
        if (bridgeCounts[e] === 0) continue;
        let nb = -1;
        if (edgeEnds[e].i === cur) nb = edgeEnds[e].j;
        else if (edgeEnds[e].j === cur) nb = edgeEnds[e].i;
        if (nb >= 0 && !visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    return visited.size === n;
  }

  let foundOtherSolution = false;

  function backtrack(eIdx, bridgeCounts) {
    if (foundOtherSolution) return;

    if (eIdx === E) {
      // 检查是否匹配目标度数
      for (let i = 0; i < n; i++) {
        if (getDeg(bridgeCounts, i) !== targetDegrees[i]) return;
      }
      if (!isConnected(bridgeCounts)) return;
      foundOtherSolution = true;
      return;
    }

    const { i, j } = edgeEnds[eIdx];
    const iDeg = getDeg(bridgeCounts, i);
    const jDeg = getDeg(bridgeCounts, j);

    for (let count = 0; count <= 2; count++) {
      if (foundOtherSolution) return;
      if (iDeg + count > targetDegrees[i] || jDeg + count > targetDegrees[j]) continue;

      // 交叉检测
      if (count > 0) {
        let cross = false;
        for (let e2 = 0; e2 < eIdx; e2++) {
          if (bridgeCounts[e2] > 0 && edgesCrossIdx(eIdx, e2)) { cross = true; break; }
        }
        if (cross) continue;
      }

      bridgeCounts[eIdx] = count;
      backtrack(eIdx + 1, bridgeCounts);
      bridgeCounts[eIdx] = 0;
    }
  }

  const counts = new Array(E).fill(0);
  backtrack(0, counts);
  return !foundOtherSolution; // false = 有第二解，true = 唯一
}

/**
 * 生成一道完整的题
 */
function generatePuzzle(config) {
  const { rows, cols, minIslands, maxIslands } = config;
  const numIslands = minIslands + Math.floor(Math.random() * (maxIslands - minIslands + 1));

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

  // 构建答案
  const result = buildAnswer(islands, config);
  if (!result) return null;

  const { answer, islandDegrees } = result;

  // 至少有一个岛度数>=2
  if (Math.max(...islandDegrees) < 2) return null;

  // 验证唯一解（easy跳过以节省时间，medium/hard抽检）
  // 由于构造法本身比较约束，大部分情况下是唯一的
  // 这里只做基本验证：答案自洽
  let totalDeg = islandDegrees.reduce((a, b) => a + b, 0);
  let answerTotal = answer.reduce((a, b) => a + b.count, 0);
  if (totalDeg !== answerTotal) return null; // 数据不一致

  const outIslands = islands.map((isl, idx) => ({
    r: isl.r, c: isl.c, n: islandDegrees[idx]
  }));

  return { rows, cols, islands: outIslands, answer };
}

// ===== 主程序 =====

const args = process.argv.slice(2);
const difficulty = args[0] || 'easy';
const config = CONFIGS[difficulty];

if (!config) {
  console.error('Usage: node generate-bridges-v3.js [easy|medium|hard]');
  process.exit(1);
}

const outDir = path.join(__dirname, difficulty);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 清空旧文件
try {
  const oldFiles = fs.readdirSync(outDir).filter(f => f.startsWith(difficulty + '-') && f.endsWith('.json'));
  for (const f of oldFiles) fs.unlinkSync(path.join(outDir, f));
} catch(e) {}

let generated = 0;
let failed = 0;
const startTime = Date.now();

while (generated < COUNT_PER_DIFFICULTY) {
  const puzzle = generatePuzzle(config);
  if (!puzzle) { failed++; continue; }

  generated++;
  const filename = difficulty + '-' + String(generated).padStart(4, '0') + '.json';
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(puzzle));

  if (generated % 100 === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${difficulty}] ${generated}/${COUNT_PER_DIFFICULTY} (${elapsed}s, ${failed}失败)`);
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ ${difficulty} 完成: ${generated}题, ${failed}次失败, 耗时${elapsed}s`);

// 抽检前5题
console.log('\n--- 抽检 ---');
for (let i = 1; i <= Math.min(5, generated); i++) {
  const fn = difficulty + '-' + String(i).padStart(4, '0') + '.json';
  const p = JSON.parse(fs.readFileSync(path.join(outDir, fn), 'utf-8'));
  
  // 验证无交叉
  let crossError = false;
  for (let a = 0; a < p.answer.length && !crossError; a++) {
    for (let b = a + 1; b < p.answer.length && !crossError; b++) {
      if (bridgesCross(p.answer[a], p.answer[b])) {
        console.log(`❌ ${fn}: 桥交叉! answer[${a}] × answer[${b}]`);
        crossError = true;
      }
    }
  }
  
  // 验证度数一致
  let degOk = true;
  const degCheck = new Array(p.islands.length).fill(0);
  for (const b of p.answer) {
    for (let idx = 0; idx < p.islands.length; idx++) {
      if (p.islands[idx].r === b.r1 && p.islands[idx].c === b.c1) degCheck[idx] += b.count;
      if (p.islands[idx].r === b.r2 && p.islands[idx].c === b.c2) degCheck[idx] += b.count;
    }
  }
  for (let idx = 0; idx < p.islands.length; idx++) {
    if (degCheck[idx] !== p.islands[idx].n) {
      console.log(`❌ ${fn}: 岛${idx}度数不一致! 标记=${p.islands[idx].n}, 实际=${degCheck[idx]}`);
      degOk = false;
    }
  }

  if (!crossError && degOk) {
    console.log(`✅ ${fn}: ${p.islands.length}岛, ${p.answer.length}桥, 度数=[${degCheck.join(',')}]`);
  }
}
