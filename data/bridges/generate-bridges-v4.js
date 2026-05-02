/**
 * 桥 (Hashiwokakero) 题库生成器 v4
 * 
 * 修复v3的问题：
 * - 岛屿放置只确保不重叠（不限制相邻），增加连通可能性
 * - 构造法生成答案（生成树+双桥+额外边），严格禁止交叉
 * - 岛数字从答案反推
 */

const fs = require('fs');
const path = require('path');

const CONFIGS = {
  easy:   { rows: 7,  cols: 7,  minIslands: 5, maxIslands: 10, maxExtraEdges: 2 },
  medium: { rows: 10, cols: 10, minIslands: 8, maxIslands: 18, maxExtraEdges: 4 },
  hard:   { rows: 13, cols: 13, minIslands: 12, maxIslands: 26, maxExtraEdges: 6 }
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

function buildAnswer(islands, config) {
  const n = islands.length;

  // 所有候选边
  const allEdges = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (canConnect(islands, i, j)) allEdges.push({ i, j });
    }
  }

  if (allEdges.length < n - 1) return null;

  // 边几何信息
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
  const treeEdges = [];

  // 用索引数组避免 indexOf
  const edgeIndexMap = new Map();
  for (let idx = 0; idx < allEdges.length; idx++) {
    edgeIndexMap.set(allEdges[idx].i + ',' + allEdges[idx].j, idx);
  }

  function getEdgeIdx(e) {
    return edgeIndexMap.get(e.i + ',' + e.j);
  }

  let primIter = 0;
  while (inTree.size < n && primIter < 100000) {
    primIter++;
    // 找能扩展树的最短边（且不与已选树边交叉）
    const candidates = [];
    for (const e of allEdges) {
      if ((inTree.has(e.i) && !inTree.has(e.j)) || (inTree.has(e.j) && !inTree.has(e.i))) {
        // 检查与已选树边的交叉
        const eIdx = getEdgeIdx(e);
        let cross = false;
        for (const tIdx of treeEdges) {
          if (edgesCrossIdx(eIdx, tIdx)) { cross = true; break; }
        }
        if (!cross) candidates.push(e);
      }
    }
    if (candidates.length === 0) return null; // 无法无交叉地连通

    // 按距离排序，从前30%随机选
    candidates.sort((a, b) => {
      const da = Math.abs(islands[a.i].r - islands[a.j].r) + Math.abs(islands[a.i].c - islands[a.j].c);
      const db = Math.abs(islands[b.i].r - islands[b.j].r) + Math.abs(islands[b.i].c - islands[b.j].c);
      return da - db;
    });
    const topN = Math.max(1, Math.floor(candidates.length * 0.3));
    const best = candidates[Math.floor(Math.random() * topN)];

    inTree.add(best.i);
    inTree.add(best.j);
    treeEdges.push(getEdgeIdx(best));
  }

  if (inTree.size < n) return null;

  // 桥计数
  const bridgeCount = new Array(allEdges.length).fill(0);
  for (const idx of treeEdges) bridgeCount[idx] = 1;

  function getDeg(idx) {
    let d = 0;
    for (let e = 0; e < allEdges.length; e++) {
      if (bridgeCount[e] > 0 && (allEdges[e].i === idx || allEdges[e].j === idx)) d += bridgeCount[e];
    }
    return d;
  }

  // 双桥升级
  const shuffledTree = [...treeEdges].sort(() => Math.random() - 0.5);
  let doubleCount = 0;
  const maxDouble = Math.min(config.maxExtraEdges, Math.max(1, Math.floor(treeEdges.length / 3)));
  for (const idx of shuffledTree) {
    if (doubleCount >= maxDouble) break;
    const e = allEdges[idx];
    if (getDeg(e.i) + 1 <= 8 && getDeg(e.j) + 1 <= 8) {
      bridgeCount[idx] = 2;
      doubleCount++;
    }
  }

  // 添加非树边（不交叉、度数≤8）
  const nonTreeIndices = [];
  for (let e = 0; e < allEdges.length; e++) {
    if (bridgeCount[e] === 0) nonTreeIndices.push(e);
  }
  nonTreeIndices.sort(() => Math.random() - 0.5);

  let extraAdded = 0;
  for (const idx of nonTreeIndices) {
    if (extraAdded >= config.maxExtraEdges) break;
    const e = allEdges[idx];
    if (getDeg(e.i) + 1 > 8 || getDeg(e.j) + 1 > 8) continue;

    let cross = false;
    for (let e2 = 0; e2 < allEdges.length; e2++) {
      if (bridgeCount[e2] > 0 && edgesCrossIdx(idx, e2)) { cross = true; break; }
    }
    if (cross) continue;

    bridgeCount[idx] = 1;
    extraAdded++;
  }

  // 构建答案
  const answer = [];
  const islandDegrees = new Array(n).fill(0);
  for (let e = 0; e < allEdges.length; e++) {
    if (bridgeCount[e] === 0) continue;
    const { i, j } = allEdges[e];
    islandDegrees[i] += bridgeCount[e];
    islandDegrees[j] += bridgeCount[e];
    answer.push({
      r1: islands[i].r, c1: islands[i].c,
      r2: islands[j].r, c2: islands[j].c,
      count: bridgeCount[e]
    });
  }

  return { answer, islandDegrees };
}

function generatePuzzle(config) {
  const { rows, cols, minIslands, maxIslands } = config;
  const numIslands = minIslands + Math.floor(Math.random() * (maxIslands - minIslands + 1));

  // 放置岛屿：只确保不重叠，不限制相邻
  const islands = [];
  const occupied = new Set();
  let attempts = 0;

  while (islands.length < numIslands && attempts < 2000) {
    attempts++;
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = r * cols + c;
    if (occupied.has(key)) continue;
    islands.push({ r, c });
    occupied.add(key);
  }

  if (islands.length < 3) return null;

  const result = buildAnswer(islands, config);
  if (!result) return null;

  const { answer, islandDegrees } = result;

  // 至少一个岛度数>=2，至少3座桥
  if (Math.max(...islandDegrees) < 2 || answer.length < 3) return null;

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
  console.error('Usage: node generate-bridges-v4.js [easy|medium|hard]');
  process.exit(1);
}

const outDir = path.join(__dirname, difficulty);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 清空旧文件
try {
  const oldFiles = fs.readdirSync(outDir).filter(f => f.startsWith(difficulty + '-') && f.endsWith('.json'));
  for (const f of oldFiles) fs.unlinkSync(path.join(outDir, f));
} catch(e) {}

let generated = 0, failed = 0;
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

  let crossError = false;
  for (let a = 0; a < p.answer.length && !crossError; a++) {
    for (let b = a + 1; b < p.answer.length && !crossError; b++) {
      if (bridgesCross(p.answer[a], p.answer[b])) {
        console.log(`❌ ${fn}: 桥交叉!`); crossError = true;
      }
    }
  }

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
      console.log(`❌ ${fn}: 岛${idx}度数不一致!`); degOk = false;
    }
  }

  if (!crossError && degOk) {
    console.log(`✅ ${fn}: ${p.islands.length}岛, ${p.answer.length}桥, 度数=[${degCheck.join(',')}]`);
  }
}
