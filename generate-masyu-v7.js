/**
 * Masyu (珍珠) v7 - 随机回路生成器（严格黑白规则）
 *
 * 规则：
 * - 黑珍珠：路径必须在此处转弯（两个方向不成直线）
 * - 白珍珠：路径必须在此处直行（两个方向成直线）
 *
 * 算法：
 * 1. 用随机化 DFS 生成经过所有格子的哈密顿回路
 * 2. 根据路径在每个格子的走向，自动判断放置黑/白珍珠
 * 3. 密度控制：随机选择合适数量的珍珠位置
 *
 * v7 vs v6：
 * - v6 用蛇形路径+bay叠加，路径太规律（几乎全是直线段）
 * - v7 用随机化 DFS 回溯，路径更自然，转弯更随机分布
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1; // 拐角
const WHITE = 2; // 直线

const CONFIG = {
  easy:   { size: 6,  minPearls: 8,  maxPearls: 14, count: 1000 },
  medium: { size: 8,  minPearls: 14, maxPearls: 24, count: 1000 },
  hard:   { size: 10, minPearls: 22, maxPearls: 36, count: 1000 }
};

// 随机打乱数组
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 方向：0=上, 1=右, 2=下, 3=左
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const OPP = [2, 3, 0, 1]; // 反方向

/**
 * 生成随机哈密顿回路
 * 使用随机化 DFS + Warnsdorff 启发式
 */
function generateHamiltonianCycle(size) {
  const total = size * size;
  const path = new Array(total);
  const visited = Array.from({ length: size }, () => Array(size).fill(false));

  // 随机起点
  const startR = Math.floor(Math.random() * size);
  const startC = Math.floor(Math.random() * size);

  path[0] = [startR, startC];
  visited[startR][startC] = true;

  let found = false;

  function dfs(idx) {
    if (idx === total) {
      // 检查最后一步是否能回到起点
      const [r, c] = path[idx - 1];
      const dr = Math.abs(r - startR);
      const dc = Math.abs(c - startC);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        found = true;
      }
      return;
    }

    const [r, c] = path[idx - 1];
    // 获取可用的邻居方向
    const dirs = shuffle([0, 1, 2, 3]);

    // Warnsdorff: 优先走向可用出口最少的邻居
    const candidates = [];
    for (const d of dirs) {
      const nr = r + DR[d];
      const nc = c + DC[d];
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
        // 计算该邻居的可用出口数（排除来路）
        let exits = 0;
        for (let dd = 0; dd < 4; dd++) {
          if (dd === OPP[d]) continue; // 排除来路
          const nnr = nr + DR[dd];
          const nnc = nc + DC[dd];
          if (nnr >= 0 && nnr < size && nnc >= 0 && nnc < size && !visited[nnr][nnc]) {
            exits++;
          }
        }
        // 如果是最后一步，确保能回到起点
        if (idx === total - 1) {
          const dr2 = Math.abs(nr - startR);
          const dc2 = Math.abs(nc - startC);
          if (!((dr2 === 1 && dc2 === 0) || (dr2 === 0 && dc2 === 1))) {
            continue;
          }
        }
        candidates.push({ d, nr, nc, exits });
      }
    }

    // 按 Warnsdorff 排序（出口少的优先），加随机扰动
    candidates.sort((a, b) => (a.exits + Math.random() * 0.5) - (b.exits + Math.random() * 0.5));

    for (const { d, nr, nc } of candidates) {
      visited[nr][nc] = true;
      path[idx] = [nr, nc];
      dfs(idx + 1);
      if (found) return;
      visited[nr][nc] = false;
    }
  }

  dfs(1);
  return found ? path : null;
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

    if (r2 === r1 - 1 && c2 === c1) {
      lines[r1][c1].top = true; lines[r2][c2].bottom = true;
    } else if (r2 === r1 + 1 && c2 === c1) {
      lines[r1][c1].bottom = true; lines[r2][c2].top = true;
    } else if (r2 === r1 && c2 === c1 - 1) {
      lines[r1][c1].left = true; lines[r2][c2].right = true;
    } else if (r2 === r1 && c2 === c1 + 1) {
      lines[r1][c1].right = true; lines[r2][c2].left = true;
    }
  }

  return lines;
}

/**
 * 在回路上放置珍珠
 * 严格遵循：直线=白珍珠，转弯=黑珍珠
 */
function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array.from({ length: size }, () => Array(size).fill(EMPTY));
  const candidates = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      const conns = [cell.top, cell.right, cell.bottom, cell.left].filter(x => x);
      if (conns.length !== 2) continue; // 路径上每个格子应该恰好2条连线

      const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);

      candidates.push({
        r, c,
        type: isStraight ? WHITE : BLACK
      });
    }
  }

  // 分类：直线格和转弯格
  const straights = candidates.filter(p => p.type === WHITE);
  const corners = candidates.filter(p => p.type === BLACK);

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));

  // 尽量让黑白比例合理：大约 50-60% 白，40-50% 黑
  const blackTarget = Math.max(3, Math.floor(targetPearls * 0.4));
  const whiteTarget = targetPearls - blackTarget;

  shuffle(straights);
  shuffle(corners);

  const selectedBlacks = corners.slice(0, Math.min(blackTarget, corners.length));
  const selectedWhites = straights.slice(0, Math.min(whiteTarget, straights.length));

  // 如果某类不够，用另一类补
  let selected = [...selectedBlacks, ...selectedWhites];
  if (selected.length < targetPearls) {
    const remaining = [...corners.slice(selectedBlacks.length), ...straights.slice(selectedWhites.length)];
    shuffle(remaining);
    selected = [...selected, ...remaining.slice(0, targetPearls - selected.length)];
  }

  // 限制总数
  selected = selected.slice(0, targetPearls);

  for (const { r, c, type } of selected) {
    grid[r][c] = type;
  }

  return { grid, pearlCount: selected.length, blackCount: selectedBlacks.length, whiteCount: selectedWhites.length };
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

      if (grid[r][c] === WHITE && !isStraight) {
        return false; // 白珍珠不在直线上
      }
      if (grid[r][c] === BLACK && isStraight) {
        return false; // 黑珍珠不在拐角上
      }
    }
  }
  return true;
}

function main() {
  console.log('Masyu v7 - 随机回路生成器（严格黑白规则）\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}×${config.size}) ===`);
    console.log(`目标: ${config.minPearls}-${config.maxPearls} 颗珍珠`);

    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    let attempts = 0;
    const maxAttempts = config.count * 3;
    const startTime = Date.now();

    while (success < config.count && attempts < maxAttempts) {
      attempts++;

      const path = generateHamiltonianCycle(config.size);
      if (!path) continue;

      const lines = pathToLines(path, config.size);
      const { grid, pearlCount, blackCount, whiteCount } = placePearls(lines, config.size, config.minPearls, config.maxPearls);

      if (!validatePuzzle(lines, grid, config.size)) {
        console.error(`  验证失败！题 ${success + 1}`);
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
        console.log(`已生成 ${success}/${config.count} (${attempts} 次尝试, ${time}s)`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`完成: ${success}/${config.count} 题, ${attempts} 次尝试, 耗时 ${time}s`);

    if (success < config.count) {
      console.log(`⚠️ 未能生成足够题目，缺少 ${config.count - success} 题`);
    }
  }
}

main();
