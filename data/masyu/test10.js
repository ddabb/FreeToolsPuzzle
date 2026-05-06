/**
 * Masyu v12 - 小批量测试（10题）
 */
const fs = require('fs');
const path = require('path');

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];

const CONFIG = {
  easy: { size: 6, pearlDensity: 0.35, blackRatio: 0.45 },
  medium: { size: 8, pearlDensity: 0.38, blackRatio: 0.5 },
  hard: { size: 10, pearlDensity: 0.40, blackRatio: 0.55 }
};

function generatePath(dotSize) {
  const visited = new Set();
  const result = [];
  for (let c = 0; c < dotSize; c++) {
    result.push([0, c]);
    visited.add(`0,${c}`);
  }
  for (let r = 1; r < dotSize; r++) {
    result.push([r, dotSize - 1]);
    visited.add(`${r},${dotSize - 1}`);
  }
  for (let c = dotSize - 2; c >= 0; c--) {
    result.push([dotSize - 1, c]);
    visited.add(`${dotSize - 1},${c}`);
  }
  for (let r = dotSize - 2; r >= 1; r--) {
    result.push([r, 0]);
    visited.add(`${r},0`);
  }

  while (result.length < dotSize * dotSize - 2) {
    const candidates = [];
    for (let i = 0; i < result.length; i++) {
      const curr = result[i];
      const next = result[(i + 1) % result.length];
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
  let count = 0;
  let r = path[startIdx][0] + dirDr;
  let c = path[startIdx][1] + dirDc;
  while (count < steps && r >= 0 && c >= 0) {
    const idx = path.findIndex(p => p[0] === r && p[1] === c);
    if (idx === -1) break;
    if (pearlSet.has(`${r},${c}`)) break;
    count++;
    r += dirDr;
    c += dirDc;
  }
  return count;
}

function generatePearlCandidates(path, dotSize, config) {
  const candidates = [];
  const pearlSet = new Set();

  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const prev = path[(i - 1 + path.length) % path.length];
    const next = path[(i + 1) % path.length];
    const inDir = { dr: curr[0] - prev[0], dc: curr[1] - prev[1] };
    const outDir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
    const isTurn = (inDir.dr * outDir.dr + inDir.dc * outDir.dc) === 0;

    if (isTurn) {
      // 黑珠：前后各需延伸≥1格
      const fwd = countExtension(path, i, outDir.dr, outDir.dc, 1, pearlSet);
      const bwd = countExtension(path, (i - 1 + path.length) % path.length, -inDir.dr, -inDir.dc, 1, pearlSet);
      if (fwd >= 1 && bwd >= 1) {
        candidates.push({ r: curr[0], c: curr[1], type: 'black', fwd, bwd });
        pearlSet.add(`${curr[0]},${curr[1]}`);
      }
    } else {
      // 白珠：前后各需延伸≥2格
      const fwd = countExtension(path, i, outDir.dr, outDir.dc, 2, pearlSet);
      const bwd = countExtension(path, (i - 1 + path.length) % path.length, -inDir.dr, -inDir.dc, 2, pearlSet);
      if (fwd >= 2 && bwd >= 2) {
        candidates.push({ r: curr[0], c: curr[1], type: 'white', fwd, bwd });
        pearlSet.add(`${curr[0]},${curr[1]}`);
      }
    }
  }
  return candidates;
}

function selectPearls(candidates, dotSize, config) {
  const target = Math.floor(dotSize * dotSize * config.pearlDensity);
  const blackTarget = Math.floor(target * config.blackRatio);
  const blacks = candidates.filter(c => c.type === 'black');
  const whites = candidates.filter(c => c.type === 'white');
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const selectedBlacks = shuffle(blacks).slice(0, Math.min(blackTarget, blacks.length));
  const remaining = target - selectedBlacks.length;
  const selectedWhites = shuffle(whites).slice(0, remaining);
  return [...selectedBlacks, ...selectedWhites].map(p => ({ r: p.r, c: p.c, type: p.type }));
}

function generatePuzzle(difficulty, id) {
  const config = CONFIG[difficulty];
  const dotSize = config.size + 1;
  const path = generatePath(dotSize);
  if (path.length < dotSize * dotSize * 0.5) return null;
  const candidates = generatePearlCandidates(path, dotSize, config);
  if (candidates.length < 5) return null;
  const pearls = selectPearls(candidates, dotSize, config);
  if (pearls.length < 3) return null;
  return {
    id, difficulty, size: config.size, dotSize, pearls,
    path: path.map(p => p[0] * dotSize + p[1]),
    pearlCount: pearls.length,
    blackCount: pearls.filter(p => p.type === 'black').length,
    whiteCount: pearls.filter(p => p.type === 'white').length
  };
}

// 核心规则验证
function validatePuzzle(puzzle) {
  const { path, pearls, dotSize } = puzzle;
  const pearlSet = new Set(pearls.map(p => `${p.r},${p.c}`));

  // 重建path坐标数组
  const pathCoords = path.map(id => [Math.floor(id / dotSize), id % dotSize]);

  // 检查每个珍珠
  for (const pearl of pearls) {
    const idx = pathCoords.findIndex(p => p[0] === pearl.r && p[1] === pearl.c);
    if (idx === -1) return { ok: false, reason: `珍珠 (${pearl.r},${pearl.c}) 不在路径上` };

    const prev = pathCoords[(idx - 1 + pathCoords.length) % pathCoords.length];
    const next = pathCoords[(idx + 1) % pathCoords.length];
    const inDir = { dr: pearl.r - prev[0], dc: pearl.c - prev[1] };
    const outDir = { dr: next[0] - pearl.r, dc: next[1] - pearl.c };
    const isTurn = (inDir.dr * outDir.dr + inDir.dc * outDir.dc) === 0;

    if (pearl.type === 'black') {
      if (!isTurn) return { ok: false, reason: `黑珠 (${pearl.r},${pearl.c}) 必须转弯` };
      // 检查前后各≥1格延伸（不含珍珠）
      for (let s = 1; s <= 1; s++) {
        const fr = pearl.r + outDir.dr * s, fc = pearl.c + outDir.dc * s;
        const br = pearl.r - inDir.dr * s, bc = pearl.c - inDir.dc * s;
        const fInPath = pathCoords.some(p => p[0] === fr && p[1] === fc);
        const bInPath = pathCoords.some(p => p[0] === br && p[1] === bc);
        if (!fInPath) return { ok: false, reason: `黑珠前第${s}格不在路径` };
        if (!bInPath) return { ok: false, reason: `黑珠后第${s}格不在路径` };
      }
    } else {
      if (isTurn) return { ok: false, reason: `白珠 (${pearl.r},${pearl.c}) 必须直行` };
      // 检查前后各≥2格延伸
      for (let s = 1; s <= 2; s++) {
        const fr = pearl.r + outDir.dr * s, fc = pearl.c + outDir.dc * s;
        const br = pearl.r - inDir.dr * s, bc = pearl.c - inDir.dc * s;
        const fInPath = pathCoords.some(p => p[0] === fr && p[1] === fc);
        const bInPath = pathCoords.some(p => p[0] === br && p[1] === bc);
        if (!fInPath) return { ok: false, reason: `白珠前第${s}格不在路径` };
        if (!bInPath) return { ok: false, reason: `白珠后第${s}格不在路径` };
      }
    }
  }
  return { ok: true };
}

// 测试10题
console.log('Masyu v12 小批量测试（10题 easy）\n');
let success = 0, fail = 0;
for (let i = 1; i <= 100; i++) {
  const puzzle = generatePuzzle('easy', i);
  if (!puzzle) continue;

  const valid = validatePuzzle(puzzle);
  const status = valid.ok ? '✅' : '❌';
  console.log(`${status} #${i}: ${puzzle.pearlCount}珠(${puzzle.blackCount}黑/${puzzle.whiteCount}白) path长${puzzle.path.length} ${valid.ok ? '' : '← ' + valid.reason}`);

  if (valid.ok) success++;
  else fail++;

  if (success + fail >= 10) break;
}

console.log(`\n结果：${success}✅ / ${fail}❌`);
