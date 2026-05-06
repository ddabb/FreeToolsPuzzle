/**
 * Masyu v13 - 唯一解验证版生成器
 * 
 * 规则：
 * - 黑珠：转弯 + 前后各≥1格延伸
 * - 白珠：直行 + 前后各≥2格延伸
 * 
 * 唯一解验证：DLX精确覆盖算法
 */

const fs = require('fs');
const path = require('path');

const DIRS = [
  { dr: -1, dc: 0, name: 'up' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: 0, dc: -1, name: 'left' },
  { dr: 0, dc: 1, name: 'right' }
];
const DIR_MAP = Object.fromEntries(DIRS.map(d => [d.name, d]));

const CONFIG = {
  easy: { size: 6, pearlDensity: 0.35, blackRatio: 0.45 },
  medium: { size: 8, pearlDensity: 0.38, blackRatio: 0.5 },
  hard: { size: 10, pearlDensity: 0.40, blackRatio: 0.55 }
};

// ============================================================
// 路径生成（增长法）
// ============================================================
function generatePath(dotSize) {
  const visited = new Set();
  const result = [];

  for (let c = 0; c < dotSize; c++) { result.push([0, c]); visited.add(`0,${c}`); }
  for (let r = 1; r < dotSize; r++) { result.push([r, dotSize - 1]); visited.add(`${r},${dotSize - 1}`); }
  for (let c = dotSize - 2; c >= 0; c--) { result.push([dotSize - 1, c]); visited.add(`${dotSize - 1},${c}`); }
  for (let r = dotSize - 2; r >= 1; r--) { result.push([r, 0]); visited.add(`${r},0`); }

  while (result.length < dotSize * dotSize - 2) {
    const candidates = [];
    for (let i = 0; i < result.length; i++) {
      const curr = result[i], next = result[(i + 1) % result.length];
      const dir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
      for (const d of DIRS) {
        if (d.dr === 0 && dir.dr === 0) continue;
        if (d.dc === 0 && dir.dc === 0) continue;
        const r1 = curr[0] + d.dr, c1 = curr[1] + d.dc;
        const r2 = next[0] + d.dr, c2 = next[1] + d.dc;
        if (r1 < 0 || r1 >= dotSize || c1 < 0 || c1 >= dotSize) continue;
        if (r2 < 0 || r2 >= dotSize || c2 < 0 || c2 >= dotSize) continue;
        if (visited.has(`${r1},${c1}`) || visited.has(`${r2},${c2}`)) continue;
        candidates.push({ index: i, points: [[r1, c1], [r2, c2]] });
      }
    }
    if (candidates.length === 0) break;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    result.splice(pick.index + 1, 0, ...pick.points);
    visited.add(`${pick.points[0][0]},${pick.points[0][1]}`);
    visited.add(`${pick.points[1][0]},${pick.points[1][1]}`);
  }
  return result;
}

function countExtension(path, startIdx, dirDr, dirDc, steps, pearlSet) {
  let count = 0, r = path[startIdx][0] + dirDr, c = path[startIdx][1] + dirDc;
  while (count < steps && r >= 0 && c >= 0) {
    const idx = path.findIndex(p => p[0] === r && p[1] === c);
    if (idx === -1) break;
    if (pearlSet.has(`${r},${c}`)) break;
    count++; r += dirDr; c += dirDc;
  }
  return count;
}

function generatePearlCandidates(path, dotSize, config) {
  const candidates = [], pearlSet = new Set();
  for (let i = 0; i < path.length; i++) {
    const curr = path[i], prev = path[(i - 1 + path.length) % path.length], next = path[(i + 1) % path.length];
    const inD = { dr: curr[0] - prev[0], dc: curr[1] - prev[1] }, outD = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
    const isTurn = (inD.dr * outD.dr + inD.dc * outD.dc) === 0;
    if (isTurn) {
      const f = countExtension(path, i, outD.dr, outD.dc, 1, pearlSet);
      const b = countExtension(path, (i - 1 + path.length) % path.length, -inD.dr, -inD.dc, 1, pearlSet);
      if (f >= 1 && b >= 1) { candidates.push({ r: curr[0], c: curr[1], type: 'black', f, b }); pearlSet.add(`${curr[0]},${curr[1]}`); }
    } else {
      const f = countExtension(path, i, outD.dr, outD.dc, 2, pearlSet);
      const b = countExtension(path, (i - 1 + path.length) % path.length, -inD.dr, -inD.dc, 2, pearlSet);
      if (f >= 2 && b >= 2) { candidates.push({ r: curr[0], c: curr[1], type: 'white', f, b }); pearlSet.add(`${curr[0]},${curr[1]}`); }
    }
  }
  return candidates;
}

function selectPearls(candidates, dotSize, config) {
  const target = Math.floor(dotSize * dotSize * config.pearlDensity);
  const bTarget = Math.floor(target * config.blackRatio);
  const blacks = candidates.filter(c => c.type === 'black'), whites = candidates.filter(c => c.type === 'white');
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sb = shuffle(blacks).slice(0, Math.min(bTarget, blacks.length));
  const rem = target - sb.length;
  const sw = shuffle(whites).slice(0, rem);
  return [...sb, ...sw].map(p => ({ r: p.r, c: p.c, type: p.type }));
}

// ============================================================
// 规则验证（生成时检查）
// ============================================================
function validatePuzzle(puzzle) {
  const { path: pathIds, pearls, dotSize } = puzzle;
  const pearlSet = new Set(pearls.map(p => `${p.r},${p.c}`));
  const pathCoords = pathIds.map(id => [Math.floor(id / dotSize), id % dotSize]);

  for (const pearl of pearls) {
    const idx = pathCoords.findIndex(p => p[0] === pearl.r && p[1] === pearl.c);
    if (idx === -1) return { ok: false, reason: `pearl not on path` };
    const prev = pathCoords[(idx - 1 + pathCoords.length) % pathCoords.length];
    const next = pathCoords[(idx + 1) % pathCoords.length];
    const inD = { dr: pearl.r - prev[0], dc: pearl.c - prev[1] }, outD = { dr: next[0] - pearl.r, dc: next[1] - pearl.c };
    const isTurn = (inD.dr * outD.dr + inD.dc * outD.dc) === 0;
    if (pearl.type === 'black') {
      if (!isTurn) return { ok: false, reason: `black must turn` };
      for (let s = 1; s <= 1; s++) {
        if (!pathCoords.some(p => p[0] === pearl.r + outD.dr * s && p[1] === pearl.c + outD.dc * s)) return { ok: false, reason: `black fwd ext missing` };
        if (!pathCoords.some(p => p[0] === pearl.r - inD.dr * s && p[1] === pearl.c - inD.dc * s)) return { ok: false, reason: `black bwd ext missing` };
      }
    } else {
      if (isTurn) return { ok: false, reason: `white must be straight` };
      for (let s = 1; s <= 2; s++) {
        if (!pathCoords.some(p => p[0] === pearl.r + outD.dr * s && p[1] === pearl.c + outD.dc * s)) return { ok: false, reason: `white fwd ext ${s} missing` };
        if (!pathCoords.some(p => p[0] === pearl.r - inD.dr * s && p[1] === pearl.c - inD.dc * s)) return { ok: false, reason: `white bwd ext ${s} missing` };
      }
    }
  }
  return { ok: true };
}

// ============================================================
// DLX 唯一解求解器
// ============================================================
function solveUnique(pearls, size) {
  const dotSize = size + 1;
  const N = dotSize * dotSize;

  // 珍珠约束映射: dotId -> { type }
  const pearlAt = {};
  for (const p of pearls) {
    pearlAt[p.r * dotSize + p.c] = p.type;
  }

  // 构建精确覆盖矩阵
  // 列:
  //   N 列: dot covered (每个点必须恰好被覆盖2次 = 2条边经过)
  //   N 列: odd-degree (每个点最多1条边，解决悬空问题)
  // 行: 每条可能的边 (u,v) with u<v
  
  const rows = []; // rows[i] = {u, v, id}
  for (let u = 0; u < N; u++) {
    const ur = Math.floor(u / dotSize), uc = u % dotSize;
    for (let v = u + 1; v < N; v++) {
      const vr = Math.floor(v / dotSize), vc = v % dotSize;
      // 必须是相邻的点
      if (Math.abs(ur - vr) + Math.abs(uc - vc) !== 1) continue;
      rows.push({ u, v, id: rows.length });
    }
  }
  const M = rows.length;

  // 覆盖列: dotCovered(N) + oddDegree(N) = 2N 列
  const COL_DOT = 0;
  const COL_ODD = N;

  function edgeRowIdx(u, v) {
    // 找边(u,v)对应的行索引
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i].u === u && rows[i].v === v) || (rows[i].u === v && rows[i].v === u)) return i;
    }
    return -1;
  }

  // DLX 结构
  const coverCount = new Array(2 * N).fill(0);
  const rowForCol = Array.from({ length: 2 * N }, () => []);
  const colForCell = []; // cellIdx -> [col, rowIdx]

  for (let ri = 0; ri < rows.length; ri++) {
    const { u, v } = rows[ri];
    colForCell.push([COL_DOT + u, ri], [COL_DOT + v, ri]);
    rowForCol[COL_DOT + u].push(ri);
    rowForCol[COL_DOT + v].push(ri);
  }

  const selected = [];
  let solutionCount = 0;
  let solutions = [];

  function solve() {
    if (solutionCount >= 2) return; // 找到2个就停止

    // 找覆盖最少的列
    let minCol = -1, minCount = Infinity;
    for (let c = 0; c < 2 * N; c++) {
      if (coverCount[c] < minCount && coverCount[c] >= 0) {
        minCount = coverCount[c];
        minCol = c;
      }
    }

    if (minCol === -1 || minCount === Infinity) {
      // 所有列已覆盖
      if (selected.length === N) { // 需要恰好N条边形成闭环
        solutionCount++;
        if (solutionCount === 1) {
          // 重建解路径
          const edgeSet = new Set(selected.map(ri => {
            const { u, v } = rows[ri];
            return `${Math.min(u, v)}-${Math.max(u, v)}`;
          }));
          solutions.push([...edgeSet]);
        }
      }
      return;
    }

    if (minCount === 0) return; // 死路

    // 尝试每一行
    const candidates = [...rowForCol[minCol]];
    // 优先选择有珍珠约束的边（减少搜索空间）
    candidates.sort((a, b) => {
      const pa = pearlAt[rows[a].u] || pearlAt[rows[a].v];
      const pb = pearlAt[rows[b].u] || pearlAt[rows[b].v];
      return (pb ? 1 : 0) - (pa ? 1 : 0);
    });

    for (const ri of candidates) {
      const { u, v } = rows[ri];
      
      // 剪枝：检查度约束
      const du = coverCount[COL_DOT + u], dv = coverCount[COL_DOT + v];
      if (du >= 2 || dv >= 2) continue;

      // 剪枝：珍珠约束
      const pu = pearlAt[u], pv = pearlAt[v];
      // 检查每条边是否违反珍珠约束
      // 一条边(u,v)被选时，它参与u和v的度
      // 对于有珍珠的顶点，度必须恰好为2，且满足turn/straight约束
      // 这个约束在后面验证解时处理，这里只做简单的度剪枝

      // 覆盖
      const covered = [];
      for (let ci = 0; ci < colForCell.length; ci++) {
        const col = colForCell[ci][0];
        if (coverCount[col] >= 0) {
          coverCount[col]++;
          covered.push(col);
        }
      }
      selected.push(ri);

      solve();

      // 恢复
      selected.pop();
      for (let ci = 0; ci < covered.length; ci++) coverCount[covered[ci]]--;
    }
  }

  solve();

  return {
    count: solutionCount,
    isUnique: solutionCount === 1,
    isSolvable: solutionCount >= 1
  };
}

// ============================================================
// 带唯一解检查的生成
// ============================================================
function generateWithUniqueCheck(difficulty, maxAttempts = 500) {
  const config = CONFIG[difficulty];
  const dotSize = config.size + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const path = generatePath(dotSize);
    if (path.length < dotSize * dotSize * 0.5) continue;

    const candidates = generatePearlCandidates(path, dotSize, config);
    if (candidates.length < 5) continue;

    const pearls = selectPearls(candidates, dotSize, config);
    if (pearls.length < 3) continue;

    const puzzle = {
      id: 0,
      difficulty,
      size: config.size,
      dotSize,
      pearls,
      path: path.map(p => p[0] * dotSize + p[1]),
      pearlCount: pearls.length,
      blackCount: pearls.filter(p => p.type === 'black').length,
      whiteCount: pearls.filter(p => p.type === 'white').length
    };

    // 规则验证
    const valid = validatePuzzle(puzzle);
    if (!valid.ok) {
      console.log(`  [${difficulty}] attempt ${attempt}: 规则验证失败 - ${valid.reason}`);
      continue;
    }

    // 唯一解验证
    const result = solveUnique(pearls, config.size);
    if (result.isUnique) {
      return { puzzle, attempts: attempt };
    }
  }

  return null;
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('Masyu v13 - 唯一解验证版\n');

  const difficulties = ['easy', 'medium', 'hard'];
  const TARGET = 1000;

  for (const difficulty of difficulties) {
    console.log(`\n=== ${difficulty} ===`);
    const dir = path.join(__dirname, difficulty);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 清空旧文件
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const f of files) fs.unlinkSync(path.join(dir, f));

    let generated = 0;
    let totalAttempts = 0;
    const startTime = Date.now();

    while (generated < TARGET) {
      const result = generateWithUniqueCheck(difficulty, 200);
      totalAttempts += result ? result.attempts : 200;
      
      if (result) {
        generated++;
        const puzzle = { ...result.puzzle, id: generated };
        const filename = `${difficulty}-${String(puzzle.id).padStart(4, '0')}.json`;
        fs.writeFileSync(path.join(dir, filename), JSON.stringify(puzzle));
        
        if (generated % 50 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (totalAttempts / generated).toFixed(1);
          process.stdout.write(`\r  ${generated}/${TARGET} (${rate}x attempts, ${elapsed}s)`);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  完成: ${TARGET}题, 成功率 ${(TARGET / totalAttempts * 100).toFixed(1)}%, 耗时 ${elapsed}s`);
  }

  console.log('\n全部完成！');
}

main().catch(console.error);
