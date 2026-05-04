/**
 * Masyu v10 - 格点布局简化版
 * 
 * 数据格式：
 * - size: 格子数 (6/8/10)
 * - dotSize: 格点数 (size+1)
 * - pearls: [{r, c, type: 'black'|'white'}]
 * - path: [dotIndex, ...]  格点索引按遍历顺序
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  easy: { size: 6, pearlCount: 8 },
  medium: { size: 8, pearlCount: 12 },
  hard: { size: 10, pearlCount: 16 }
};

/**
 * 生成简单矩形回路并随机变形
 */
function generateLoop(dotSize, iterations) {
  // 从外圈矩形开始
  const loop = [];
  
  // 顶边 (左→右)
  for (let c = 0; c < dotSize - 1; c++) {
    loop.push({ r: 0, c });
  }
  // 右边 (上→下)
  for (let r = 0; r < dotSize - 1; r++) {
    loop.push({ r, c: dotSize - 1 });
  }
  // 底边 (右→左)
  for (let c = dotSize - 1; c > 0; c--) {
    loop.push({ r: dotSize - 1, c });
  }
  // 左边 (下→上)
  for (let r = dotSize - 1; r > 0; r--) {
    loop.push({ r, c: 0 });
  }
  
  // 随机变形
  for (let i = 0; i < iterations; i++) {
    deformLoop(loop, dotSize);
  }
  
  return loop;
}

/**
 * 变形：选一条边向内凸出
 */
function deformLoop(loop, dotSize) {
  const loopSet = new Set(loop.map(p => `${p.r},${p.c}`));
  
  // 随机选一条边
  const edgeIdx = Math.floor(Math.random() * loop.length);
  const p1 = loop[edgeIdx];
  const p2 = loop[(edgeIdx + 1) % loop.length];
  
  // 计算边的方向
  const dr = p2.r - p1.r;
  const dc = p2.c - p1.c;
  
  // 向内方向（垂直于边，指向中心）
  let inwardDr = 0, inwardDc = 0;
  if (dr === 0) { // 水平边
    inwardDr = p1.r < dotSize / 2 ? 1 : -1;
  } else { // 垂直边
    inwardDc = p1.c < dotSize / 2 ? 1 : -1;
  }
  
  // 检查能否变形
  const newR1 = p1.r + inwardDr;
  const newC1 = p1.c + inwardDc;
  const newR2 = p2.r + inwardDr;
  const newC2 = p2.c + inwardDc;
  
  // 边界检查
  if (newR1 < 1 || newR1 >= dotSize - 1) return;
  if (newC1 < 1 || newC1 >= dotSize - 1) return;
  if (newR2 < 1 || newR2 >= dotSize - 1) return;
  if (newC2 < 1 || newC2 >= dotSize - 1) return;
  
  // 碰撞检查
  if (loopSet.has(`${newR1},${newC1}`)) return;
  if (loopSet.has(`${newR2},${newC2}`)) return;
  
  // 执行变形：在边上插入两个新点
  loop.splice(edgeIdx + 1, 0, 
    { r: newR2, c: newC2 },
    { r: newR1, c: newC1 }
  );
}

/**
 * 判断格点是否是转弯点
 */
function isTurnPoint(loop, idx) {
  const prev = loop[(idx - 1 + loop.length) % loop.length];
  const curr = loop[idx];
  const next = loop[(idx + 1) % loop.length];
  
  const dir1 = { dr: prev.r - curr.r, dc: prev.c - curr.c };
  const dir2 = { dr: next.r - curr.r, dc: next.c - curr.c };
  
  // 转弯：前后方向垂直
  return dir1.dr * dir2.dr + dir1.dc * dir2.dc === 0;
}

/**
 * 检查白珠是否满足直行+延伸条件
 */
function checkWhitePearl(loop, idx, dotSize) {
  const prev = loop[(idx - 1 + loop.length) % loop.length];
  const curr = loop[idx];
  const next = loop[(idx + 1) % loop.length];
  
  // 必须直行
  const dir1 = { dr: prev.r - curr.r, dc: prev.c - curr.c };
  const dir2 = { dr: next.r - curr.r, dc: next.c - curr.c };
  
  if (!(dir1.dr + dir2.dr === 0 && dir1.dc + dir2.dc === 0)) {
    return false; // 不是直行
  }
  
  // 检查前后延伸
  // 向前延伸
  let forwardSteps = 0;
  let checkIdx = idx;
  while (true) {
    const prevIdx = (checkIdx - 1 + loop.length) % loop.length;
    const prevPt = loop[prevIdx];
    const currPt = loop[checkIdx];
    const d = { dr: prevPt.r - currPt.r, dc: prevPt.c - currPt.c };
    if (d.dr === dir1.dr && d.dc === dir1.dc) {
      forwardSteps++;
      checkIdx = prevIdx;
    } else break;
    if (forwardSteps >= 2) break;
  }
  
  // 向后延伸
  let backwardSteps = 0;
  checkIdx = idx;
  while (true) {
    const nextIdx = (checkIdx + 1) % loop.length;
    const nextPt = loop[nextIdx];
    const currPt = loop[checkIdx];
    const d = { dr: nextPt.r - currPt.r, dc: nextPt.c - currPt.c };
    if (d.dr === -dir1.dr && d.dc === -dir1.dc) {
      backwardSteps++;
      checkIdx = nextIdx;
    } else break;
    if (backwardSteps >= 2) break;
  }
  
  return forwardSteps >= 1 && backwardSteps >= 1;
}

/**
 * 放置珍珠
 */
function placePearls(loop, targetCount, dotSize) {
  const pearls = [];
  const candidates = [];
  
  // 遍历路径，找出满足约束的候选点
  for (let i = 0; i < loop.length; i++) {
    const pt = loop[i];
    
    // 排除边界点（通常不在边界放珍珠）
    if (pt.r === 0 || pt.r === dotSize - 1 || pt.c === 0 || pt.c === dotSize - 1) {
      continue;
    }
    
    if (isTurnPoint(loop, i)) {
      candidates.push({ r: pt.r, c: pt.c, type: 'black', idx: i });
    } else if (checkWhitePearl(loop, i, dotSize)) {
      candidates.push({ r: pt.r, c: pt.c, type: 'white', idx: i });
    }
  }
  
  // 随机选择
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(targetCount, candidates.length));
  
  return selected.map(p => ({
    r: p.r,
    c: p.c,
    type: p.type
  }));
}

/**
 * 生成谜题
 */
function generatePuzzle(difficulty, id) {
  const config = CONFIG[difficulty];
  const dotSize = config.size + 1;
  
  // 生成回路
  const loop = generateLoop(dotSize, dotSize * 4);
  
  // 放置珍珠
  const pearls = placePearls(loop, config.pearlCount, dotSize);
  
  if (pearls.length < 3) return null;
  
  return {
    id,
    difficulty,
    size: config.size,
    dotSize: dotSize,
    pearls: pearls,
    path: loop.map(p => p.r * dotSize + p.c),
    pearlCount: pearls.length,
    blackCount: pearls.filter(p => p.type === 'black').length,
    whiteCount: pearls.filter(p => p.type === 'white').length
  };
}

/**
 * 批量生成
 */
async function generateBatch(difficulty, count) {
  const dir = path.join(__dirname, difficulty);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let generated = 0;
  let id = 1;
  
  while (generated < count && id <= count * 3) {
    const puzzle = generatePuzzle(difficulty, generated + 1);
    
    if (puzzle) {
      const filename = `${difficulty}-${String(generated + 1).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(puzzle, null, 2));
      generated++;
      process.stdout.write(`\r${difficulty}: ${generated}/${count}`);
    }
    
    id++;
  }
  
  console.log(`\n${difficulty}: ${generated} puzzles`);
  return generated;
}

/**
 * 主函数
 */
async function main() {
  console.log('Masyu v10 格点布局生成器\n');
  
  const start = Date.now();
  
  await generateBatch('easy', 1000);
  await generateBatch('medium', 1000);
  await generateBatch('hard', 1000);
  
  console.log(`\n总耗时: ${((Date.now() - start) / 1000).toFixed(2)}s`);
}

main().catch(console.error);
