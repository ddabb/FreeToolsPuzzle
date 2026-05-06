/**
 * Masyu v12 - 简化延伸检查逻辑
 * 
 * 规则：
 * - 黑珠：路径在点处转弯，且前后各至少各有1格延伸（不含珍珠）
 * - 白珠：路径在点处直行，且前后各至少各有2格延伸（不含珍珠）
 */

const fs = require('fs');
const path = require('path');

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];

// 配置
const CONFIG = {
  easy: { size: 6, pearlDensity: 0.35, blackRatio: 0.45 },
  medium: { size: 8, pearlDensity: 0.38, blackRatio: 0.5 },
  hard: { size: 10, pearlDensity: 0.40, blackRatio: 0.55 }
};

/**
 * 生成闭合哈密顿路径（增长法）
 */
function generatePath(dotSize) {
  const visited = new Set();
  const result = [];
  
  // 外圈矩形
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
  
  // 增长
  while (result.length < dotSize * dotSize - 2) {
    const candidates = [];
    
    for (let i = 0; i < result.length; i++) {
      const curr = result[i];
      const next = result[(i + 1) % result.length];
      const dir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
      
      for (const d of DIRS) {
        // 只考虑垂直于当前边的方向
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

/**
 * 检查延伸（从珍珠往前/往后走n步）
 * @param {Array} path - 完整路径
 * @param {number} startIdx - 起始索引
 * @param {number} dirDr, dirDc - 方向
 * @param {number} steps - 需要检查的步数
 * @param {Array} pearlSet - 珍珠位置集合
 */
function countExtension(path, startIdx, dirDr, dirDc, steps, pearlSet) {
  let count = 0;
  let r = path[startIdx][0] + dirDr;
  let c = path[startIdx][1] + dirDc;
  
  while (count < steps && r >= 0 && c >= 0) {
    // 在路径中查找这个点
    const idx = path.findIndex(p => p[0] === r && p[1] === c);
    if (idx === -1) break;
    
    // 检查是否是珍珠
    if (pearlSet.has(`${r},${c}`)) break;
    
    count++;
    
    // 继续往下一格
    r += dirDr;
    c += dirDc;
  }
  
  return count;
}

/**
 * 生成珍珠候选
 */
function generatePearlCandidates(path, dotSize, config) {
  const candidates = [];
  const pearlSet = new Set(); // 用于去重
  
  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const prev = path[(i - 1 + path.length) % path.length];
    const next = path[(i + 1) % path.length];
    
    // 进入和退出方向
    const inDir = { dr: curr[0] - prev[0], dc: curr[1] - prev[1] };
    const outDir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
    
    // 检查是否转弯
    const isTurn = (inDir.dr * outDir.dr + inDir.dc * outDir.dc) === 0;
    
    if (isTurn) {
      // 黑珠候选：前后各需延伸≥1格
      const fwd = countExtension(path, i, outDir.dr, outDir.dc, 1, pearlSet);
      const bwd = countExtension(path, (i - 1 + path.length) % path.length, -inDir.dr, -inDir.dc, 1, pearlSet);
      
      if (fwd >= 1 && bwd >= 1) {
        candidates.push({ r: curr[0], c: curr[1], type: 'black', fwd, bwd });
        pearlSet.add(`${curr[0]},${curr[1]}`);
      }
    } else {
      // 白珠候选：前后各需延伸≥2格
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

/**
 * 选择珍珠（根据密度）
 */
function selectPearls(candidates, dotSize, config) {
  const target = Math.floor(dotSize * dotSize * config.pearlDensity);
  const blackTarget = Math.floor(target * config.blackRatio);
  
  const blacks = candidates.filter(c => c.type === 'black');
  const whites = candidates.filter(c => c.type === 'white');
  
  // 随机打乱
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

/**
 * 生成谜题
 */
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
    id,
    difficulty,
    size: config.size,
    dotSize,
    pearls,
    path: path.map(p => p[0] * dotSize + p[1]),
    pearlCount: pearls.length,
    blackCount: pearls.filter(p => p.type === 'black').length,
    whiteCount: pearls.filter(p => p.type === 'white').length
  };
}

/**
 * 批量生成
 */
async function generateBatch(difficulty, count) {
  const results = [];
  
  for (let i = 1; i <= count; i++) {
    const puzzle = generatePuzzle(difficulty, i);
    if (puzzle) {
      results.push(puzzle);
      process.stdout.write(`\r${difficulty}: ${results.length}/${count}`);
    }
    
    if (results.length % 100 === 0 && results.length > 0) {
      await saveBatch(difficulty, results);
    }
  }
  
  await saveBatch(difficulty, results);
  console.log(`\n${difficulty}: ${results.length} puzzles`);
  return results;
}

/**
 * 保存
 */
async function saveBatch(difficulty, puzzles) {
  const dir = path.join(__dirname, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  for (const puzzle of puzzles) {
    const filename = `${difficulty}-${String(puzzle.id).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(puzzle, null, 2));
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('Masyu v12 - 修正延伸逻辑\n');
  
  const start = Date.now();
  await generateBatch('easy', 1000);
  await generateBatch('medium', 1000);
  await generateBatch('hard', 1000);
  
  console.log(`\n耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch(console.error);