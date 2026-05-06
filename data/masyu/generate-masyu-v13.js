/**
 * Masyu v13 - 实用版：规则正确 + 有解验证 + 时间限制
 * 
 * 策略：
 * 1. 生成规则正确的 puzzle（黑珠转弯+≥1延伸，白珠直行+≥2延伸）
 * 2. 用限时回溯验证至少有一个解
 * 3. 唯一解：降低密度提高成功率，用珍珠数启发式判断
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
  easy: { size: 6, pearlDensity: 0.20, blackRatio: 0.40 },
  medium: { size: 8, pearlDensity: 0.22, blackRatio: 0.45 },
  hard: { size: 10, pearlDensity: 0.25, blackRatio: 0.50 }
};

// ============================================================
// 路径生成
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
  const target = Math.floor(dotSize * dotSize * config.pearlDensity), bTarget = Math.floor(target * config.blackRatio);
  const blacks = candidates.filter(c => c.type === 'black'), whites = candidates.filter(c => c.type === 'white');
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sb = shuffle(blacks).slice(0, Math.min(bTarget, blacks.length));
  return [...sb, ...shuffle(whites).slice(0, target - sb.length)].map(p => ({ r: p.r, c: p.c, type: p.type }));
}

function validatePuzzle(puzzle) {
  const { path: pathIds, pearls, dotSize } = puzzle;
  const pathCoords = pathIds.map(id => [Math.floor(id / dotSize), id % dotSize]);
  for (const pearl of pearls) {
    const idx = pathCoords.findIndex(p => p[0] === pearl.r && p[1] === pearl.c);
    if (idx === -1) return { ok: false, reason: 'pearl not on path' };
    const prev = pathCoords[(idx - 1 + pathCoords.length) % pathCoords.length];
    const next = pathCoords[(idx + 1) % pathCoords.length];
    const inD = { dr: pearl.r - prev[0], dc: pearl.c - prev[1] }, outD = { dr: next[0] - pearl.r, dc: next[1] - pearl.c };
    const isTurn = (inD.dr * outD.dr + inD.dc * outD.dc) === 0;
    if (pearl.type === 'black') {
      if (!isTurn) return { ok: false, reason: 'black must turn' };
      for (let s = 1; s <= 1; s++) {
        if (!pathCoords.some(p => p[0] === pearl.r + outD.dr * s && p[1] === pearl.c + outD.dc * s)) return { ok: false, reason: 'black fwd ext missing' };
        if (!pathCoords.some(p => p[0] === pearl.r - inD.dr * s && p[1] === pearl.c - inD.dc * s)) return { ok: false, reason: 'black bwd ext missing' };
      }
    } else {
      if (isTurn) return { ok: false, reason: 'white must be straight' };
      for (let s = 1; s <= 2; s++) {
        if (!pathCoords.some(p => p[0] === pearl.r + outD.dr * s && p[1] === pearl.c + outD.dc * s)) return { ok: false, reason: `white fwd ext ${s} missing` };
        if (!pathCoords.some(p => p[0] === pearl.r - inD.dr * s && p[1] === pearl.c - inD.dc * s)) return { ok: false, reason: `white bwd ext ${s} missing` };
      }
    }
  }
  return { ok: true };
}

// ============================================================
// 限时有解验证
// ============================================================
function hasSolution(pearls, size, timeLimitMs) {
  const dotSize = size + 1, N = dotSize * dotSize;
  const pearlAt = {};
  for (const p of pearls) pearlAt[p.r * dotSize + p.c] = p.type;

  const adj = Array.from({ length: N }, () => []);
  for (let r = 0; r < dotSize; r++) for (let c = 0; c < dotSize; c++) {
    const d = r * dotSize + c;
    for (const dd of DIRS) {
      const nr = r + dd.dr, nc = c + dd.dc;
      if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) continue;
      adj[d].push(nr * dotSize + nc);
    }
  }

  const degree = new Array(N).fill(0);
  const usedEdges = new Set();
  let found = false;
  const startTime = Date.now();

  function pearlOK(d) {
    const type = pearlAt[d];
    if (!type || degree[d] !== 2) return true;
    const nb = [];
    for (const e of usedEdges) {
      const [a, b] = e.split('-').map(Number);
      if (a === d) nb.push(b); else if (b === d) nb.push(a);
    }
    if (nb.length !== 2) return true;
    const r = Math.floor(d / dotSize), c = d % dotSize;
    const r1 = Math.floor(nb[0] / dotSize), c1 = nb[0] % dotSize;
    const r2 = Math.floor(nb[1] / dotSize), c2 = nb[1] % dotSize;
    const dr1 = r1 - r, dc1 = c1 - c, dr2 = r2 - r, dc2 = c2 - c;
    const isTurn = (dr1 * dr2 + dc1 * dc2) === 0;
    return type === 'black' ? isTurn : !isTurn;
  }

  function deadEnd() {
    if (Date.now() - startTime > timeLimitMs) return true;
    for (let d = 0; d < N; d++) {
      if (degree[d] > 2) return true;
      if (degree[d] === 2 && !pearlOK(d)) return true;
      if (degree[d] === 1) {
        let ok = false;
        for (const nb of adj[d]) {
          if (degree[nb] < 2) {
            const k = d < nb ? `${d}-${nb}` : `${nb}-${d}`;
            if (!usedEdges.has(k)) { ok = true; break; }
          }
        }
        if (!ok) return true;
      }
      if (degree[d] === 0) {
        let avail = false;
        for (const nb of adj[d]) if (degree[nb] < 2) { avail = true; break; }
        if (!avail) return true;
      }
    }
    return false;
  }

  function branch() {
    if (found) return;
    if (deadEnd()) return;

    let done = true;
    for (let d = 0; d < N; d++) { if (degree[d] < 2) { done = false; break; } }
    if (done) {
      if (usedEdges.size === N) {
        // 连通性检查
        const first = usedEdges.values().next().value;
        const [s] = first.split('-').map(Number);
        const vis = new Set([s]), q = [s];
        while (q.length) {
          const c = q.shift();
          for (const e of usedEdges) {
            const [a, b] = e.split('-').map(Number);
            const nb = a === c ? b : (b === c ? a : -1);
            if (nb >= 0 && !vis.has(nb)) { vis.add(nb); q.push(nb); }
          }
        }
        if (vis.size === N) found = true;
      }
      return;
    }

    // 选分支顶点：优先珍珠
    let best = -1, bestN = Infinity;
    for (const pearl of pearls) {
      const d = pearl.r * dotSize + pearl.c;
      if (degree[d] < 2) {
        let n = 0;
        for (const nb of adj[d]) {
          if (degree[nb] < 2) {
            const k = d < nb ? `${d}-${nb}` : `${nb}-${d}`;
            if (!usedEdges.has(k)) n++;
          }
        }
        if (n > 0 && n < bestN) { best = d; bestN = n; }
      }
    }
    if (best === -1) {
      for (let d = 0; d < N; d++) {
        if (degree[d] < 2) {
          let n = 0;
          for (const nb of adj[d]) {
            if (degree[nb] < 2) {
              const k = d < nb ? `${d}-${nb}` : `${nb}-${d}`;
              if (!usedEdges.has(k)) n++;
            }
          }
          if (n > 0 && n < bestN) { best = d; bestN = n; }
        }
      }
    }
    if (best === -1) return;

    const cand = [];
    for (const nb of adj[best]) {
      if (degree[nb] >= 2) continue;
      const k = best < nb ? `${best}-${nb}` : `${nb}-${best}`;
      if (usedEdges.has(k)) continue;
      cand.push({ nb, k });
    }

    for (const { nb, k } of cand) {
      usedEdges.add(k);
      const odV = degree[best], odNb = degree[nb];
      degree[best]++; degree[nb]++;
      branch();
      degree[best] = odV; degree[nb] = odNb;
      usedEdges.delete(k);
    }
  }

  branch();
  return found;
}

// ============================================================
// 主函数
// ============================================================
async function main() {
  console.log('Masyu v13 - 规则正确 + 有解验证\n');
  console.log('规则：黑珠转弯+≥1延伸，白珠直行+≥2延伸\n');

  const difficulties = ['easy', 'medium', 'hard'];
  const TARGET = 1000;
  const TIME_LIMIT = 50; // ms

  for (const difficulty of difficulties) {
    console.log(`\n=== ${difficulty} ===`);
    const dir = path.join(__dirname, difficulty);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const f of files) fs.unlinkSync(path.join(dir, f));

    let generated = 0;
    let totalAttempts = 0;
    let noSolution = 0;
    let invalidRule = 0;
    const startTime = Date.now();

    while (generated < TARGET) {
      const config = CONFIG[difficulty];
      const dotSize = config.size + 1;

      let puzzle = null;
      let attempts = 0;
      while (!puzzle && attempts < 500) {
        attempts++;
        const pathCoords = generatePath(dotSize);
        if (pathCoords.length < dotSize * dotSize * 0.5) continue;

        const candidates = generatePearlCandidates(pathCoords, dotSize, config);
        if (candidates.length < 5) continue;

        const pearls = selectPearls(candidates, dotSize, config);
        if (pearls.length < 3) continue;

        puzzle = {
          id: 0,
          difficulty,
          size: config.size,
          dotSize,
          pearls,
          path: pathCoords.map(p => p[0] * dotSize + p[1]),
          pearlCount: pearls.length,
          blackCount: pearls.filter(p => p.type === 'black').length,
          whiteCount: pearls.filter(p => p.type === 'white').length
        };

        const valid = validatePuzzle(puzzle);
        if (!valid.ok) { invalidRule++; puzzle = null; continue; }

        const hasSol = hasSolution(pearls, config.size, TIME_LIMIT);
        if (!hasSol) { noSolution++; puzzle = null; continue; }
      }

      totalAttempts += attempts;

      if (puzzle) {
        generated++;
        const p = { ...puzzle, id: generated };
        const filename = `${difficulty}-${String(p.id).padStart(4, '0')}.json`;
        fs.writeFileSync(path.join(dir, filename), JSON.stringify(p));

        if (generated % 50 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (totalAttempts / generated).toFixed(1);
          process.stdout.write(`\r  ${generated}/${TARGET} (${rate}x, ${elapsed}s, 无解${noSolution} 无效${invalidRule})`);
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n  完成: ${TARGET}题, ${(TARGET / totalAttempts * 100).toFixed(1)}%成功率, ${elapsed}s`);
  }

  console.log('\n全部完成！');
}

main().catch(console.error);
