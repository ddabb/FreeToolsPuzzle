/**
 * Masyu (珍珠) v9 - 链表路径格式生成器
 *
 * 数据格式变更：
 *   v8: lines[r][c] = {top,right,bottom,left}  → 每题 ~2-4KB
 *   v9: path = [idx1, idx2, idx3, ...]          → 每题 ~0.3-0.5KB
 *
 * path 是回路经过的格子索引列表（r*size+c），按遍历顺序排列
 * 相邻两个索引表示一条边，首尾相连形成闭合回路
 *
 * 前端根据 path 直接渲染线条，无需维护 hEdges/vEdges 二维数组
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1; // 拐角
const WHITE = 2; // 直线

const CONFIG = {
  easy:   { size: 6,  minLoopPct: 0.55, maxLoopPct: 0.85, minPearls: 8,  maxPearls: 14, count: 1000 },
  medium: { size: 8,  minLoopPct: 0.50, maxLoopPct: 0.85, minPearls: 14, maxPearls: 24, count: 1000 },
  hard:   { size: 10, minLoopPct: 0.45, maxLoopPct: 0.85, minPearls: 22, maxPearls: 36, count: 1000 }
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 增长法生成闭合回路（与v8相同算法）
 * 返回 [[r,c], [r,c], ...] 坐标列表
 */
function generateLoop(size, minLen, maxLen) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = tryGrowLoop(size, minLen, maxLen);
    if (result) return result;
  }
  return null;
}

function tryGrowLoop(size, minLen, maxLen) {
  const sr = Math.floor(Math.random() * (size - 1));
  const sc = Math.floor(Math.random() * (size - 1));
  let loop = [[sr, sc], [sr, sc + 1], [sr + 1, sc + 1], [sr + 1, sc]];

  const inLoop = new Set();
  loop.forEach(([r, c]) => inLoop.add(r * size + c));

  let stuck = 0;
  while (loop.length < maxLen && stuck < 100) {
    const extensions = [];

    for (let i = 0; i < loop.length; i++) {
      const [r1, c1] = loop[i];
      const [r2, c2] = loop[(i + 1) % loop.length];

      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) continue;

      const dr = r2 - r1, dc = c2 - c1;

      if (dc !== 0) {
        const row = r1;
        if (row > 0) {
          const a = [row - 1, c1], b = [row - 1, c2];
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
        if (row < size - 1) {
          const a = [row + 1, c1], b = [row + 1, c2];
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
      } else {
        const col = c1;
        if (col > 0) {
          const a = [r1, col - 1], b = [r2, col - 1];
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
        if (col < size - 1) {
          const a = [r1, col + 1], b = [r2, col + 1];
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
      }
    }

    if (extensions.length === 0) { stuck++; continue; }

    shuffle(extensions);
    const ext = extensions[0];
    const [a, b] = ext.cells;

    loop.splice(ext.edgeIdx + 1, 0, a, b);
    inLoop.add(a[0] * size + a[1]);
    inLoop.add(b[0] * size + b[1]);
    stuck = 0;
  }

  if (loop.length >= minLen) return loop;
  return null;
}

/**
 * 验证路径是有效闭合回路
 */
function validatePath(path, size) {
  if (path.length < 8) return false;

  // 检查每步相邻（曼哈顿距离=1）
  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];
    const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
    if (dist !== 1) return false;
  }

  // 检查无重复格子
  const seen = new Set();
  for (let i = 0; i < path.length; i++) {
    const key = path[i][0] * size + path[i][1];
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
}

/**
 * 放置珍珠：根据路径判断直行/转弯
 */
function placePearls(path, size, minPearls, maxPearls) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));

  const straights = [];
  const corners = [];

  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const prev = path[(i - 1 + path.length) % path.length];
    const next = path[(i + 1) % path.length];

    const dPrevR = prev[0] - r1, dPrevC = prev[1] - c1;
    const dNextR = next[0] - r1, dNextC = next[1] - c1;

    // 直行：来去方向相反
    const isStraight = (dPrevR === -dNextR && dPrevC === -dNextC);

    if (isStraight) straights.push([r1, c1]);
    else corners.push([r1, c1]);
  }

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
  const blackTarget = Math.max(3, Math.round(targetPearls * 0.4));
  const whiteTarget = targetPearls - blackTarget;

  shuffle(straights);
  shuffle(corners);

  const selectedBlacks = corners.slice(0, Math.min(blackTarget, corners.length));
  const selectedWhites = straights.slice(0, Math.min(whiteTarget, straights.length));

  let selected = [...selectedBlacks, ...selectedWhites];

  if (selected.length < targetPearls) {
    const extraCorners = corners.slice(selectedBlacks.length);
    const extraStraights = straights.slice(selectedWhites.length);
    const remaining = shuffle([...extraCorners, ...extraStraights]);
    selected = [...selected, ...remaining.slice(0, targetPearls - selected.length)];
  }

  selected = selected.slice(0, targetPearls);

  for (const [r, c] of selected) {
    const idx = path.findIndex(p => p[0] === r && p[1] === c);
    if (idx === -1) continue;

    const prev = path[(idx - 1 + path.length) % path.length];
    const next = path[(idx + 1) % path.length];

    const dPrevR = prev[0] - r, dPrevC = prev[1] - c;
    const dNextR = next[0] - r, dNextC = next[1] - c;
    const isStraight = (dPrevR === -dNextR && dPrevC === -dNextC);

    grid[r][c] = isStraight ? WHITE : BLACK;
  }

  const blackCount = selected.filter(([r, c]) => grid[r][c] === BLACK).length;
  const whiteCount = selected.filter(([r, c]) => grid[r][c] === WHITE).length;

  return { grid, pearlCount: selected.length, blackCount, whiteCount };
}

function main() {
  console.log('Masyu v9 - 链表路径格式生成器\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}x${config.size}) ===`);
    const total = config.size * config.size;
    const minLen = Math.max(8, Math.floor(total * config.minLoopPct));
    const maxLen = Math.floor(total * config.maxLoopPct);
    console.log(`回路长度: ${minLen}-${maxLen}, 珍珠: ${config.minPearls}-${config.maxPearls}`);

    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    let fails = 0;
    const startTime = Date.now();

    for (let i = 0; i < config.count + 500; i++) {
      if (success >= config.count) break;

      const path = generateLoop(config.size, minLen, maxLen);
      if (!path) { fails++; continue; }

      if (!validatePath(path, config.size)) {
        fails++;
        continue;
      }

      const { grid, pearlCount, blackCount, whiteCount } = placePearls(
        path, config.size, config.minPearls, config.maxPearls
      );

      // 转换为链表格式：cell index = r * size + c
      const pathIndices = path.map(([r, c]) => r * config.size + c);

      const filename = `${difficulty}-${(success + 1).toString().padStart(4, '0')}.json`;
      const filepath = pathModule.join(outDir, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        id: success + 1,
        difficulty,
        size: config.size,
        grid,
        path: pathIndices,
        pearlCount,
        blackCount,
        whiteCount
      }));

      success++;

      if (success % 100 === 0) {
        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ${success}/${config.count} (${time}s) pathLen=${pathIndices.length}`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`完成: ${success}/${config.count} 题, 失败${fails}, 耗时${time}s`);
  }
}

main();
