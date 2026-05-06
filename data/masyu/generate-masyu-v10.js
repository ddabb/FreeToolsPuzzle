/**
 * Masyu (珍珠) 题库生成器 v10
 * 格点布局 - 符合传统规则
 * 
 * 规则：
 * 1. 珍珠放在格点（格子交点）上
 * 2. 黑珠：路径必须在此转弯
 * 3. 白珠：路径必须直行穿过，且至少延伸2格
 * 4. 路径形成单一闭合回路
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  easy: { size: 6, pearlDensity: 0.15, blackRatio: 0.4 },
  medium: { size: 8, pearlDensity: 0.18, blackRatio: 0.45 },
  hard: { size: 10, pearlDensity: 0.20, blackRatio: 0.5 }
};

// 方向向量
const DIRS = [
  { dr: -1, dc: 0, name: 'up' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: 0, dc: -1, name: 'left' },
  { dr: 0, dc: 1, name: 'right' }
];

/**
 * 格点路径生成 - 使用增长法
 */
function generatePath(dotSize) {
  const visited = new Set();
  const path = [];
  
  // 从外圈矩形开始（必须形成闭合回路）
  // 顶边: (0,0) -> (0,1) -> ... -> (0, dotSize-1)
  for (let c = 0; c < dotSize; c++) {
    path.push([0, c]);
    visited.add(`0,${c}`);
  }
  // 右边: (1, dotSize-1) -> ... -> (dotSize-1, dotSize-1)
  for (let r = 1; r < dotSize; r++) {
    path.push([r, dotSize - 1]);
    visited.add(`${r},${dotSize - 1}`);
  }
  // 底边: (dotSize-1, dotSize-2) -> ... -> (dotSize-1, 0)
  for (let c = dotSize - 2; c >= 0; c--) {
    path.push([dotSize - 1, c]);
    visited.add(`${dotSize - 1},${c}`);
  }
  // 左边: (dotSize-2, 0) -> ... -> (1, 0)
  for (let r = dotSize - 2; r >= 1; r--) {
    path.push([r, 0]);
    visited.add(`${r},0`);
  }
  
  // 增长法：每次选一个可扩展的边，向外凸出
  while (path.length < dotSize * dotSize - 2) {
    // 找可扩展的边
    const expandable = [];
    
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const next = path[(i + 1) % path.length];
      
      // 计算边的方向
      const dr = next[0] - curr[0];
      const dc = next[1] - curr[1];
      
      // 尝试向左或向右凸出
      for (const dir of DIRS) {
        // 只考虑垂直于当前边的方向
        if (dir.dr === 0 && dr === 0) continue; // 都是水平
        if (dir.dc === 0 && dc === 0) continue; // 都是垂直
        
        const newR1 = curr[0] + dir.dr;
        const newC1 = curr[1] + dir.dc;
        const newR2 = next[0] + dir.dr;
        const newC2 = next[1] + dir.dc;
        
        // 边界检查
        if (newR1 < 0 || newR1 >= dotSize || newC1 < 0 || newC1 >= dotSize) continue;
        if (newR2 < 0 || newR2 >= dotSize || newC2 < 0 || newC2 >= dotSize) continue;
        
        // 检查是否已访问
        if (visited.has(`${newR1},${newC1}`) || visited.has(`${newR2},${newC2}`)) continue;
        
        expandable.push({
          index: i,
          newPoints: [[newR1, newC1], [newR2, newC2]],
          dir: dir
        });
      }
    }
    
    if (expandable.length === 0) break;
    
    // 随机选一个扩展
    const expand = expandable[Math.floor(Math.random() * expandable.length)];
    
    // 在路径中插入新点
    // newPoints[0] 紧接 curr，newPoints[1] 紧接 next
    // splice 参数按插入位置从左到右，所以先 [0] 再 [1]
    const insertIndex = expand.index + 1;
    path.splice(insertIndex, 0, expand.newPoints[0], expand.newPoints[1]);
    visited.add(`${expand.newPoints[0][0]},${expand.newPoints[0][1]}`);
    visited.add(`${expand.newPoints[1][0]},${expand.newPoints[1][1]}`);
  }
  
  return path;
}

/**
 * 检查格点是否满足珍珠规则
 */
function checkPearlConstraint(path, pearlR, pearlC, isBlack) {
  // 找到珍珠在路径中的位置
  let idx = -1;
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === pearlR && path[i][1] === pearlC) {
      idx = i;
      break;
    }
  }
  
  if (idx === -1) return false;
  
  const prev = path[(idx - 1 + path.length) % path.length];
  const curr = path[idx];
  const next = path[(idx + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  
  if (isBlack) {
    // 黑珠：必须转弯（前后方向垂直）
    return dir1.dr * dir2.dr + dir1.dc * dir2.dc === 0;
  } else {
    // 白珠：必须直行（前后方向相反，即直行）
    const isStraight = (dir1.dr + dir2.dr === 0) && (dir1.dc + dir2.dc === 0);
    if (!isStraight) return false;
    
    // 白珠还要检查至少延伸2格
    // 向前检查
    let forwardCount = 0;
    let checkIdx = idx;
    let checkDir = { dr: -dir1.dr, dc: -dir1.dc };
    while (true) {
      const nextIdx = (checkIdx + 1) % path.length;
      const nextPoint = path[nextIdx];
      const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
      if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
        forwardCount++;
        checkIdx = nextIdx;
      } else break;
      if (forwardCount >= 2) break;
    }
    
    // 向后检查
    let backwardCount = 0;
    checkIdx = idx;
    checkDir = { dr: -dir2.dr, dc: -dir2.dc };
    while (true) {
      const prevIdx = (checkIdx - 1 + path.length) % path.length;
      const prevPoint = path[prevIdx];
      const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
      if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
        backwardCount++;
        checkIdx = prevIdx;
      } else break;
      if (backwardCount >= 2) break;
    }
    
    return forwardCount >= 1 && backwardCount >= 1;
  }
}

/**
 * 放置珍珠
 */
function placePearls(path, dotSize, config) {
  const pearls = [];
  const pathSet = new Set(path.map(p => `${p[0]},${p[1]}`));
  
  // 找所有路径上的格点，检查哪些满足珍珠约束
  const candidates = [];
  
  for (let i = 0; i < path.length; i++) {
    const curr = path[i];
    const prev = path[(i - 1 + path.length) % path.length];
    const next = path[(i + 1) % path.length];
    
    const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
    const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
    
    // 检查是否转弯
    const isTurn = dir1.dr * dir2.dr + dir1.dc * dir2.dc === 0;
    
    if (isTurn) {
      candidates.push({ r: curr[0], c: curr[1], type: 'black' });
    } else {
      // 白珠：直行，且前后各至少延伸1格（共3格直线）
      // 向前检查
      let forwardCount = 0;
      let checkIdx = i;
      let checkDir = { dr: -dir1.dr, dc: -dir1.dc };
      while (true) {
        const nextIdx = (checkIdx + 1) % path.length;
        const nextPoint = path[nextIdx];
        const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          forwardCount++;
          checkIdx = nextIdx;
        } else break;
        if (forwardCount >= 2) break;
      }
      
      // 向后检查
      let backwardCount = 0;
      checkIdx = i;
      checkDir = { dr: -dir2.dr, dc: -dir2.dc };
      while (true) {
        const prevIdx = (checkIdx - 1 + path.length) % path.length;
        const prevPoint = path[prevIdx];
        const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          backwardCount++;
          checkIdx = prevIdx;
        } else break;
        if (backwardCount >= 2) break;
      }
      
      // 白珠规则：必须直行通过，且前后各至少延伸2格（不含珍珠本身）
      // 即珍珠在直线段中间，前后各至少2格延伸
      if (forwardCount >= 2 && backwardCount >= 2) {
        candidates.push({ r: curr[0], c: curr[1], type: 'white' });
      }
    }
  }
  
  // 根据密度选择珍珠
  const targetCount = Math.floor(dotSize * dotSize * config.pearlDensity);
  const blackTarget = Math.floor(targetCount * config.blackRatio);
  
  // 优先选择黑珠（约束更强）
  const blackCandidates = candidates.filter(c => c.type === 'black');
  const whiteCandidates = candidates.filter(c => c.type === 'white');
  
  // 随机选择
  const selectedBlack = shuffle(blackCandidates).slice(0, Math.min(blackTarget, blackCandidates.length));
  const remaining = targetCount - selectedBlack.length;
  const selectedWhite = shuffle(whiteCandidates).slice(0, remaining);
  
  return [...selectedBlack, ...selectedWhite];
}

/**
 * 验证解的唯一性（简化版）
 */
function hasUniqueSolution(path, pearls, dotSize) {
  // TODO: 实现完整的唯一解验证
  // 这里先用启发式：珍珠数量足够多，解就唯一
  return pearls.length >= Math.floor(dotSize * 0.8);
}

/**
 * 工具函数
 */
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生成单个谜题
 */
function generatePuzzle(difficulty, id) {
  const config = CONFIG[difficulty];
  const dotSize = config.size + 1; // 格点数 = 格子数 + 1
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // 生成路径
    const path = generatePath(dotSize);
    
    if (path.length < dotSize * dotSize * 0.5) {
      continue; // 路径太短，重试
    }
    
    // 放置珍珠
    const pearls = placePearls(path, dotSize, config);
    
    if (pearls.length < 3) {
      continue; // 珍珠太少，重试
    }
    
    // 检查唯一性
    if (!hasUniqueSolution(path, pearls, dotSize)) {
      continue;
    }
    
    // 构建结果
    const result = {
      id,
      difficulty,
      size: config.size,
      dotSize: dotSize,
      pearls: pearls.map(p => ({
        r: p.r,
        c: p.c,
        type: p.type
      })),
      path: path.map(p => p[0] * dotSize + p[1]), // 格点索引
      pearlCount: pearls.length,
      blackCount: pearls.filter(p => p.type === 'black').length,
      whiteCount: pearls.filter(p => p.type === 'white').length
    };
    
    return result;
  }
  
  return null;
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
    
    // 每100题保存一次
    if (results.length % 100 === 0) {
      await saveBatch(difficulty, results);
    }
  }
  
  await saveBatch(difficulty, results);
  console.log(`\n${difficulty}: ${results.length} puzzles generated`);
  
  return results;
}

/**
 * 保存到文件
 */
async function saveBatch(difficulty, puzzles) {
  const dir = path.join(__dirname, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  for (const puzzle of puzzles) {
    const filename = `${difficulty}-${String(puzzle.id).padStart(4, '0')}.json`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, JSON.stringify(puzzle, null, 2));
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('Masyu v10 - 格点布局生成器');
  console.log('=========================\n');
  
  const startTime = Date.now();
  
  await generateBatch('easy', 1000);
  await generateBatch('medium', 1000);
  await generateBatch('hard', 1000);
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n总耗时: ${elapsed.toFixed(2)}s`);
}

main().catch(console.error);
