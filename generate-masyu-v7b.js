/**
 * Masyu (珍珠) v7 - 改进版回路生成器（严格黑白规则）
 *
 * v6 的问题：蛇形路径太规律，转弯只在行首行尾，黑白珍珠分布不自然
 * v7a DFS版本：8x8+ 超时
 *
 * v7b 方案：基于蛇形路径 + 大量随机局部变换（2-opt + 3-opt）
 * - 蛇形保证所有格子被覆盖
 * - 2-opt：交换路径中的两段，改变局部走向
 * - 这样路径更自然，转弯分布更均匀
 * - 然后根据路径实际走向判断黑白珍珠
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1; // 拐角
const WHITE = 2; // 直线

const CONFIG = {
  easy:   { size: 6,  minPearls: 8,  maxPearls: 14, count: 1000, swaps: 30 },
  medium: { size: 8,  minPearls: 14, maxPearls: 24, count: 1000, swaps: 60 },
  hard:   { size: 10, minPearls: 22, maxPearls: 36, count: 1000, swaps: 100 }
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 生成基础蛇形路径
 */
function generateSnakePath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push([r, c]);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  return path;
}

/**
 * 检查路径是否所有格子恰好出现一次
 */
function isValidPath(path, size) {
  if (path.length !== size * size) return false;
  const seen = new Set();
  for (const [r, c] of path) {
    if (r < 0 || r >= size || c < 0 || c >= size) return false;
    const key = r * size + c;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

/**
 * 检查路径是否形成闭合回路（每步相邻，最后一步回到起点）
 */
function isClosedLoop(path) {
  const n = path.length;
  for (let i = 0; i < n; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % n];
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return false;
  }
  return true;
}

/**
 * 2-opt swap：反转 path[i..j] 之间的段
 * 只有当 swap 后路径仍然相邻时才有效
 */
function twoOptSwap(path, i, j) {
  const newPath = [...path];
  // 反转 i 到 j
  let left = i, right = j;
  while (left < right) {
    [newPath[left], newPath[right]] = [newPath[right], newPath[left]];
    left++;
    right--;
  }
  return newPath;
}

/**
 * 随机局部变换
 * 找到路径中两个不相邻的格子，它们在网格中相邻，可以"重新布线"
 */
function randomLocalRewire(path, size) {
  const n = path.length;
  // 建立位置索引
  const posMap = new Map();
  for (let i = 0; i < n; i++) {
    posMap.set(path[i][0] * size + path[i][1], i);
  }

  // 随机尝试多次
  for (let attempt = 0; attempt < 50; attempt++) {
    // 随机选一个位置 i
    const i = Math.floor(Math.random() * n);
    const [r1, c1] = path[i];

    // 找到在网格中相邻但不在路径中相邻的格子
    const neighbors = [];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r1 + dr, nc = c1 + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const j = posMap.get(nr * size + nc);
        if (j !== undefined) {
          // 检查是否在路径中不相邻
          const dist = Math.abs(j - i);
          if (dist > 1 && dist < n - 1) {
            neighbors.push(j);
          }
        }
      }
    }

    if (neighbors.length === 0) continue;

    // 随机选一个邻居 j
    const j = neighbors[Math.floor(Math.random() * neighbors.length)];

    // 确保 i < j
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);

    // 执行 2-opt swap
    const newPath = twoOptSwap(path, lo + 1, hi - 1);

    // 验证新路径
    if (isClosedLoop(newPath) && isValidPath(newPath, size)) {
      return newPath;
    }
  }

  return null; // 没有找到有效的变换
}

/**
 * 生成随机化的回路
 * 基于蛇形路径 + 多次局部变换
 */
function generateRandomLoop(size, numSwaps) {
  let path = generateSnakePath(size);

  // 应用随机变换
  let swapCount = 0;
  for (let i = 0; i < numSwaps * 3; i++) {
    const newPath = randomLocalRewire(path, size);
    if (newPath) {
      path = newPath;
      swapCount++;
      if (swapCount >= numSwaps) break;
    }
  }

  // 随机旋转/翻转
  const transforms = [
    (p) => p.map(([r, c]) => [r, c]),                           // 原样
    (p) => p.map(([r, c]) => [r, size - 1 - c]),                // 水平翻转
    (p) => p.map(([r, c]) => [size - 1 - r, c]),                // 垂直翻转
    (p) => p.map(([r, c]) => [size - 1 - r, size - 1 - c]),    // 旋转180
    (p) => p.map(([r, c]) => [c, size - 1 - r]),                // 旋转90
    (p) => p.map(([r, c]) => [size - 1 - c, r]),                // 旋转270
  ];

  const transform = transforms[Math.floor(Math.random() * transforms.length)];
  path = transform(path);

  // 随机旋转起点
  const offset = Math.floor(Math.random() * path.length);
  path = [...path.slice(offset), ...path.slice(0, offset)];

  return path;
}

/**
 * 从路径生成连线信息
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
 * 放置珍珠 - 严格黑白规则
 * 白珍珠=直线，黑珍珠=拐角
 */
function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));

  const straights = []; // 直线位 → 白珍珠候选
  const corners = [];   // 转弯位 → 黑珍珠候选

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      if (isStraight) {
        straights.push([r, c]);
      } else {
        corners.push([r, c]);
      }
    }
  }

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));

  // 目标比例：~40%黑 + ~60%白
  const blackTarget = Math.max(3, Math.round(targetPearls * 0.4));
  const whiteTarget = targetPearls - blackTarget;

  shuffle(straights);
  shuffle(corners);

  const selectedBlacks = corners.slice(0, Math.min(blackTarget, corners.length));
  const selectedWhites = straights.slice(0, Math.min(whiteTarget, straights.length));

  let selected = [...selectedBlacks, ...selectedWhites];

  // 补足
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
 * 验证珍珠规则
 */
function validatePuzzle(lines, grid, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === EMPTY) continue;
      const cell = lines[r][c];
      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);
      if (grid[r][c] === WHITE && !isStraight) return false;
      if (grid[r][c] === BLACK && isStraight) return false;
    }
  }
  return true;
}

function main() {
  console.log('Masyu v7b - 蛇形+局部变换回路生成器（严格黑白规则）\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}×${config.size}) ===`);
    console.log(`目标: ${config.minPearls}-${config.maxPearls} 颗珍珠, ${config.swaps} 次变换`);

    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    const startTime = Date.now();

    for (let i = 0; i < config.count; i++) {
      const path = generateRandomLoop(config.size, config.swaps);
      const lines = pathToLines(path, config.size);
      const { grid, pearlCount, blackCount, whiteCount } = placePearls(lines, config.size, config.minPearls, config.maxPearls);

      if (!validatePuzzle(lines, grid, config.size)) {
        console.error(`  验证失败！题 ${success + 1}`);
        i--;
        continue;
      }

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
        console.log(`已生成 ${success}/${config.count} (${time}s)`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`完成: ${success}/${config.count} 题, 耗时 ${time}s`);
  }
}

main();
