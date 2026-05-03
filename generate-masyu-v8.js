/**
 * Masyu (珍珠) v8 - 随机回路生成器
 *
 * v7b 致命问题：
 *   蛇形路径在 even×even 网格上起点终点不相邻，pathToLines 跳过闭包边
 *   导致所有3000题答案都是断开路径（非闭合回路）
 *   2-opt 变换也基本无效（成功率极低）
 *
 * v8 方案：增长法(Grow)生成闭合回路
 *   - 从 2×2 方格开始
 *   - 每次选择一条相邻边，向外"凸出"添加2个格子
 *   - 保证每步都生成有效闭合回路
 *   - 水平/垂直边比例 ~50:50（自然分布）
 *
 * Masyu 规则：
 *   1. 画一条闭合回路（不经过所有格子，只经过珍珠格子）
 *   2. 白珍珠：直线穿过
 *   3. 黑珍珠：在此拐弯
 *   4. 回路不能交叉或分叉
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
 * 增长法生成闭合回路
 * 从 2×2 方格开始，每次向外凸出添加2格
 */
function generateLoop(size, minLen, maxLen) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const result = tryGrowLoop(size, minLen, maxLen);
    if (result) return result;
  }
  return null;
}

function tryGrowLoop(size, minLen, maxLen) {
  // 随机起始 2×2 方格
  const sr = Math.floor(Math.random() * (size - 1));
  const sc = Math.floor(Math.random() * (size - 1));
  let loop = [[sr, sc], [sr, sc + 1], [sr + 1, sc + 1], [sr + 1, sc]];

  const inLoop = new Set();
  loop.forEach(([r, c]) => inLoop.add(r * size + c));

  let stuck = 0;
  while (loop.length < maxLen && stuck < 100) {
    const extensions = [];

    for (let i = 0; i < loop.length; i++) {
      const [r1, c1] = loop[i]; // A
      const [r2, c2] = loop[(i + 1) % loop.length]; // B

      // 只扩展相邻边（距离=1）
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) continue;

      const dr = r2 - r1, dc = c2 - c1;

      if (dc !== 0) {
        // 水平边 A→B（同行）
        const row = r1;
        // 向上凸出
        if (row > 0) {
          const a = [row - 1, c1], b = [row - 1, c2]; // a邻A, b邻B
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
        // 向下凸出
        if (row < size - 1) {
          const a = [row + 1, c1], b = [row + 1, c2];
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
      } else {
        // 垂直边 A→B（同列）
        const col = c1;
        // 向左凸出
        if (col > 0) {
          const a = [r1, col - 1], b = [r2, col - 1]; // a邻A, b邻B
          if (!inLoop.has(a[0] * size + a[1]) && !inLoop.has(b[0] * size + b[1]))
            extensions.push({ edgeIdx: i, cells: [a, b] });
        }
        // 向右凸出
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

    // 在 loop[edgeIdx] 和 loop[edgeIdx+1] 之间插入 a, b
    // 原: ...A → B...
    // 新: ...A → a → b → B...
    loop.splice(ext.edgeIdx + 1, 0, a, b);
    inLoop.add(a[0] * size + a[1]);
    inLoop.add(b[0] * size + b[1]);
    stuck = 0;
  }

  if (loop.length >= minLen) return loop;
  return null;
}

/**
 * 从回路路径生成 lines 数据
 */
function pathToLines(path, size) {
  const lines = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );

  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];

    if (r2 === r1 - 1) { lines[r1][c1].top = true; lines[r2][c2].bottom = true; }
    else if (r2 === r1 + 1) { lines[r1][c1].bottom = true; lines[r2][c2].top = true; }
    else if (c2 === c1 - 1) { lines[r1][c1].left = true; lines[r2][c2].right = true; }
    else if (c2 === c1 + 1) { lines[r1][c1].right = true; lines[r2][c2].left = true; }
  }

  return lines;
}

/**
 * 验证 lines 是有效闭合回路
 */
function validateLoop(lines, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const count = (cell.top ? 1 : 0) + (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0) + (cell.right ? 1 : 0);
      if (count !== 0 && count !== 2) return false;
    }
  }

  // BFS 检查连通性
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue = [];
  let loopCells = 0;

  outer:
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const count = (cell.top ? 1 : 0) + (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0) + (cell.right ? 1 : 0);
      if (count === 2) {
        queue.push([r, c]);
        visited[r][c] = true;
        break outer;
      }
    }
  }

  let totalLoopCells = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const count = (cell.top ? 1 : 0) + (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0) + (cell.right ? 1 : 0);
      if (count === 2) totalLoopCells++;
    }

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    loopCells++;
    const cell = lines[r][c];
    if (cell.top && r > 0 && !visited[r - 1][c]) { visited[r - 1][c] = true; queue.push([r - 1, c]); }
    if (cell.bottom && r < size - 1 && !visited[r + 1][c]) { visited[r + 1][c] = true; queue.push([r + 1, c]); }
    if (cell.left && c > 0 && !visited[r][c - 1]) { visited[r][c - 1] = true; queue.push([r, c - 1]); }
    if (cell.right && c < size - 1 && !visited[r][c + 1]) { visited[r][c + 1] = true; queue.push([r, c + 1]); }
  }

  return loopCells === totalLoopCells;
}

/**
 * 放置珍珠
 * - 黑珍珠：回路在此拐弯
 * - 白珍珠：回路在此直行
 */
function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));

  const straights = []; // 白珍珠候选
  const corners = [];   // 黑珍珠候选

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const count = (cell.top ? 1 : 0) + (cell.bottom ? 1 : 0) + (cell.left ? 1 : 0) + (cell.right ? 1 : 0);
      if (count !== 2) continue;

      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      if (isStraight) straights.push([r, c]);
      else corners.push([r, c]);
    }
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
    const cell = lines[r][c];
    const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
    grid[r][c] = isStraight ? WHITE : BLACK;
  }

  const blackCount = selected.filter(([r, c]) => grid[r][c] === BLACK).length;
  const whiteCount = selected.filter(([r, c]) => grid[r][c] === WHITE).length;

  return { grid, pearlCount: selected.length, blackCount, whiteCount };
}

/**
 * 统计边数
 */
function countEdges(lines, size) {
  let hEdges = 0, vEdges = 0;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (lines[r][c].right) hEdges++;
      if (lines[r][c].bottom) vEdges++;
    }
  return { hEdges, vEdges };
}

function main() {
  console.log('Masyu v8 - 增长法闭合回路生成器\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}x${config.size}) ===`);
    const total = config.size * config.size;
    const minLen = Math.max(8, Math.floor(total * config.minLoopPct));
    const maxLen = Math.floor(total * config.maxLoopPct);
    console.log(`回路长度: ${minLen}-${maxLen} (总格${total}), 珍珠: ${config.minPearls}-${config.maxPearls}`);

    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    let fails = 0;
    const startTime = Date.now();
    let totalH = 0, totalV = 0;

    for (let i = 0; i < config.count + 500; i++) {
      if (success >= config.count) break;

      const path = generateLoop(config.size, minLen, maxLen);
      if (!path) { fails++; continue; }

      const lines = pathToLines(path, config.size);

      if (!validateLoop(lines, config.size)) {
        fails++;
        continue;
      }

      const { hEdges, vEdges } = countEdges(lines, config.size);
      totalH += hEdges;
      totalV += vEdges;

      const { grid, pearlCount, blackCount, whiteCount } = placePearls(
        lines, config.size, config.minPearls, config.maxPearls
      );

      const filename = `${difficulty}-${(success + 1).toString().padStart(4, '0')}.json`;
      const filepath = pathModule.join(outDir, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        id: success + 1,
        difficulty,
        size: config.size,
        grid,
        lines,
        pearlCount,
        blackCount,
        whiteCount
      }));

      success++;

      if (success % 100 === 0) {
        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        const avgH = (totalH / success).toFixed(1);
        const avgV = (totalV / success).toFixed(1);
        console.log(`  ${success}/${config.count} (${time}s) H=${avgH} V=${avgV} ratio=${(totalH / (totalH + totalV) * 100).toFixed(0)}%`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgH = success > 0 ? (totalH / success).toFixed(1) : 'N/A';
    const avgV = success > 0 ? (totalV / success).toFixed(1) : 'N/A';
    console.log(`完成: ${success}/${config.count} 题, 失败${fails}, 耗时${time}s`);
    if (success > 0) console.log(`  水平边=${avgH}, 垂直边=${avgV}, H%=${(totalH / (totalH + totalV) * 100).toFixed(0)}%`);
  }
}

main();
