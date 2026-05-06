/**
 * Masyu 题库生成器 v11 - 简化版
 * 高珍珠密度 + 抽样验证
 */

const fs = require('fs');
const path = require('path');

// 配置 - 平衡密度和可行性
const CONFIG = {
  easy: { size: 6, pearlDensity: 0.35, blackRatio: 0.45 },
  medium: { size: 8, pearlDensity: 0.38, blackRatio: 0.5 },
  hard: { size: 10, pearlDensity: 0.40, blackRatio: 0.55 }
};

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];

/**
 * 生成闭合路径（增长法）
 */
function generatePath(dotSize) {
  const visited = new Set();
  const path = [];
  
  // 从外圈开始
  for (let c = 0; c < dotSize; c++) {
    path.push([0, c]);
    visited.add(`0,${c}`);
  }
  for (let r = 1; r < dotSize; r++) {
    path.push([r, dotSize - 1]);
    visited.add(`${r},${dotSize - 1}`);
  }
  for (let c = dotSize - 2; c >= 0; c--) {
    path.push([dotSize - 1, c]);
    visited.add(`${dotSize - 1},${c}`);
  }
  for (let r = dotSize - 2; r >= 1; r--) {
    path.push([r, 0]);
    visited.add(`${r},0`);
  }
  
  // 增长扩展
  while (path.length < dotSize * dotSize - 2) {
    const expandable = [];
    
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const next = path[(i + 1) % path.length];
      const dr = next[0] - curr[0];
      const dc = next[1] - curr[1];
      
      for (const dir of DIRS) {
        if (dir.dr === 0 && dr === 0) continue;
        if (dir.dc === 0 && dc === 0) continue;
        
        const newR1 = curr[0] + dir.dr;
        const newC1 = curr[1] + dir.dc;
        const newR2 = next[0] + dir.dr;
        const newC2 = next[1] + dir.dc;
        
        if (newR1 < 0 || newR1 >= dotSize || newC1 < 0 || newC1 >= dotSize) continue;
        if (newR2 < 0 || newR2 >= dotSize || newC2 < 0 || newC2 >= dotSize) continue;
        if (visited.has(`${newR1},${newC1}`) || visited.has(`${newR2},${newC2}`)) continue;
        
        expandable.push({
          index: i,
          newPoints: [[newR1, newC1], [newR2, newC2]]
        });
      }
    }
    
    if (expandable.length === 0) break;
    
    const choice = expandable[Math.floor(Math.random() * expandable.length)];
    const [p1, p2] = choice.newPoints;
    
    path.splice(choice.index + 1, 0, p1, p2);
    visited.add(`${p1[0]},${p1[1]}`);
    visited.add(`${p2[0]},${p2[1]}`);
  }
  
  return path;
}

/**
 * 检查黑珠约束（转弯+延伸≥1格）
 */
function checkBlackPearl(path, idx, dotSize) {
  const curr = path[idx];
  const prev = path[(idx - 1 + path.length) % path.length];
  const next = path[(idx + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  
  // 必须转弯
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  if (!isTurn) return false;
  
  // 前后各延伸至少1格
  let forwardCount = 0;
  let checkIdx = (idx + 1) % path.length;
  let checkDir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  for (let step = 0; step < 3; step++) {
    const nextIdx = (checkIdx + 1) % path.length;
    const nextPoint = path[nextIdx];
    const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      forwardCount++;
      checkIdx = nextIdx;
    } else break;
  }
  
  let backwardCount = 0;
  checkIdx = (idx - 1 + path.length) % path.length;
  checkDir = { dr: curr[0] - prev[0], dc: curr[1] - prev[1] };
  for (let step = 0; step < 3; step++) {
    const prevIdx = (checkIdx - 1 + path.length) % path.length;
    const prevPoint = path[prevIdx];
    const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      backwardCount++;
      checkIdx = prevIdx;
    } else break;
  }
  
  return forwardCount >= 1 && backwardCount >= 1;
}

/**
 * 检查白珠约束（直行+延伸≥2格）
 */
function checkWhitePearl(path, idx, dotSize) {
  const curr = path[idx];
  const prev = path[(idx - 1 + path.length) % path.length];
  const next = path[(idx + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  
  // 必须直行
  const isStraight = (dir1.dr * dir2.dc - dir1.dc * dir2.dr) === 0;
  if (!isStraight) return false;
  
  // 前后各延伸至少2格
  let forwardCount = 0;
  let checkIdx = (idx + 1) % path.length;
  let checkDir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  for (let step = 0; step < 5; step++) {
    const nextIdx = (checkIdx + 1) % path.length;
    const nextPoint = path[nextIdx];
    const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      forwardCount++;
      checkIdx = nextIdx;
    } else break;
  }
  
  let backwardCount = 0;
  checkIdx = (idx - 1 + path.length) % path.length;
  checkDir = { dr: curr[0] - prev[0], dc: curr[1] - prev[1] };
  for (let step = 0; step < 5; step++) {
    const prevIdx = (checkIdx - 1 + path.length) % path.length;
    const prevPoint = path[prevIdx];
    const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      backwardCount++;
      checkIdx = prevIdx;
    } else break;
  }
  
  return forwardCount >= 2 && backwardCount >= 2;
}

/**
 * 放置珍珠（高密度）
 */
function placePearls(path, dotSize, config) {
  const candidates = [];
  
  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const prev = path[(i - 1 + path.length) % path.length];
    const next = path[(i + 1) % path.length];
    
    const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
    const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
    const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
    
    if (isTurn && checkBlackPearl(path, i, dotSize)) {
      candidates.push({ r: curr[0], c: curr[1], type: 'black' });
    } else if (!isTurn && checkWhitePearl(path, i, dotSize)) {
      candidates.push({ r: curr[0], c: curr[1], type: 'white' });
    }
  }
  
  // 高密度选择
  const targetCount = Math.floor(dotSize * dotSize * config.pearlDensity);
  const blackTarget = Math.floor(targetCount * config.blackRatio);
  
  const blackCandidates = candidates.filter(c => c.type === 'black');
  const whiteCandidates = candidates.filter(c => c.type === 'white');
  
  // 随机打乱
  const shuffle = arr => {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  
  const selectedBlack = shuffle(blackCandidates).slice(0, blackTarget);
  const remaining = targetCount - selectedBlack.length;
  const selectedWhite = shuffle(whiteCandidates).slice(0, remaining);
  
  return [...selectedBlack, ...selectedWhite];
}

/**
 * 生成谜题（不验证唯一解，高密度即可）
 */
function generatePuzzle(difficulty, id) {
  const config = CONFIG[difficulty];
  const dotSize = config.size + 1;
  
  const path = generatePath(dotSize);
  if (path.length < dotSize * dotSize * 0.5) return null;
  
  const pearls = placePearls(path, dotSize, config);
  if (pearls.length < 5) return null;
  
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
  console.log(`\n${difficulty}: ${results.length} puzzles generated`);
  
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
  console.log('Masyu v11 - 高密度生成器');
  console.log('=========================\n');
  
  const startTime = Date.now();
  
  await generateBatch('easy', 1000);
  await generateBatch('medium', 1000);
  await generateBatch('hard', 1000);
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n总耗时: ${elapsed.toFixed(2)}s`);
}

main().catch(console.error);
