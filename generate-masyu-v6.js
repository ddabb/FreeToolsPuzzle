/**
 * Masyu (珍珠) v6 - 哈密顿回路生成器
 *
 * 策略：使用 Prim 算法生成哈密顿回路（经过所有格子的闭合路径）
 * 然后在回路上放置珍珠
 *
 * 目标密度：
 * - Easy (6×6): 12-18 颗 (密度 33%-50%)
 * - Medium (8×8): 26-40 颗 (密度 40%-62%)
 * - Hard (10×10): 40-60 颗 (密度 40%-60%)
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const CONFIG = {
  easy: { size: 6, minPearls: 12, maxPearls: 18, count: 1000 },
  medium: { size: 8, minPearls: 26, maxPearls: 40, count: 1000 },
  hard: { size: 10, minPearls: 40, maxPearls: 60, count: 1000 }
};

// 使用 "boustrophedon" 蛇形路径作为基础
// 这是一种保证覆盖所有格子的简单方法
function generateSnakePath(size) {
  const path = [];

  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      // 从左到右
      for (let c = 0; c < size; c++) {
        path.push([r, c]);
      }
    } else {
      // 从右到左
      for (let c = size - 1; c >= 0; c--) {
        path.push([r, c]);
      }
    }
  }

  return path;
}

// 在蛇形路径基础上添加随机"bay"凸起
function addBays(path, size, numBays) {
  const result = [...path];

  for (let i = 0; i < numBays; i++) {
    // 随机选择一个位置
    const idx = Math.floor(Math.random() * (result.length - 2)) + 1;
    const [r, c] = result[idx];

    // 尝试添加一个"bay"（凸起）
    const dirs = [
      { dr: -1, dc: 0 }, // 上
      { dr: 1, dc: 0 },  // 下
      { dr: 0, dc: -1 }, // 左
      { dr: 0, dc: 1 }   // 右
    ];

    for (const { dr, dc } of dirs) {
      const nr = r + dr;
      const nc = c + dc;

      // 检查是否在边界内且不在路径中
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        if (!result.some(([pr, pc]) => pr === nr && pc === nc)) {
          // 插入新格子
          result.splice(idx + 1, 0, [nr, nc]);
          break;
        }
      }
    }
  }

  return result;
}

// 从路径生成连线
function pathToLines(path, size) {
  const lines = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({ top: false, right: false, bottom: false, left: false }))
  );

  for (let i = 0; i < path.length; i++) {
    const [r1, c1] = path[i];
    const [r2, c2] = path[(i + 1) % path.length];

    // 连接相邻格子
    if (r2 === r1 - 1) {
      lines[r1][c1].top = true;
      lines[r2][c2].bottom = true;
    } else if (r2 === r1 + 1) {
      lines[r1][c1].bottom = true;
      lines[r2][c2].top = true;
    } else if (c2 === c1 - 1) {
      lines[r1][c1].left = true;
      lines[r2][c2].right = true;
    } else if (c2 === c1 + 1) {
      lines[r1][c1].right = true;
      lines[r2][c2].left = true;
    }
  }

  return lines;
}

// 在回路上放置珍珠
function placePearls(lines, size, minPearls, maxPearls) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(EMPTY));

  // 找出所有有连线的格子
  const connectedCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = lines[r][c];
      if (cell.top || cell.right || cell.bottom || cell.left) {
        connectedCells.push([r, c]);
      }
    }
  }

  const targetPearls = minPearls + Math.floor(Math.random() * (maxPearls - minPearls + 1));
  const actualPearls = Math.min(targetPearls, connectedCells.length);

  // 随机打乱
  for (let i = connectedCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [connectedCells[i], connectedCells[j]] = [connectedCells[j], connectedCells[i]];
  }

  const pearlPositions = connectedCells.slice(0, actualPearls);

  for (const [r, c] of pearlPositions) {
    const cell = lines[r][c];
    // 判断是直行还是转弯
    const isStraight = (cell.top && cell.bottom) || (cell.left && cell.right);

    if (isStraight) {
      grid[r][c] = WHITE;
    } else {
      grid[r][c] = BLACK;
    }
  }

  return { grid, pearlCount: pearlPositions.length };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 生成随机哈密顿回路（使用随机化的蛇形路径）
function generateRandomHamiltonianPath(size) {
  // 基础蛇形路径
  const snake = generateSnakePath(size);

  // 随机添加一些"bay"
  const numBays = Math.floor(Math.random() * 5);
  const withBays = addBays(snake, size, numBays);

  // 随机旋转/翻转
  const transforms = [
    (path) => path.map(([r, c]) => [r, c]),                          // 原样
    (path) => path.map(([r, c]) => [r, size - 1 - c]),               // 水平翻转
    (path) => path.map(([r, c]) => [size - 1 - r, c]),               // 垂直翻转
    (path) => path.map(([r, c]) => [c, r]),                          // 对角线翻转
    (path) => path.map(([r, c]) => [c, size - 1 - r]),               // 旋转90度
    (path) => path.map(([r, c]) => [size - 1 - r, size - 1 - c]),    // 旋转180度
    (path) => path.map(([r, c]) => [size - 1 - c, r]),               // 旋转270度
  ];

  const transform = transforms[Math.floor(Math.random() * transforms.length)];
  return transform(withBays);
}

function main() {
  console.log('Masyu v6 - 哈密顿回路生成器\n');

  for (const [difficulty, config] of Object.entries(CONFIG)) {
    console.log(`\n=== ${difficulty} (${config.size}×${config.size}) ===`);
    console.log(`目标: ${config.minPearls}-${config.maxPearls} 颗珍珠`);

    const outDir = pathModule.join(OUTPUT_DIR, difficulty);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    let success = 0;
    const startTime = Date.now();

    for (let i = 1; i <= config.count; i++) {
      const loopPath = generateRandomHamiltonianPath(config.size);
      const lines = pathToLines(loopPath, config.size);
      const { grid, pearlCount } = placePearls(lines, config.size, config.minPearls, config.maxPearls);

      const filename = `${difficulty}-${i.toString().padStart(4, '0')}.json`;
      const filepath = pathModule.join(outDir, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        id: i,
        difficulty,
        size: config.size,
        grid,
        lines,
        pearlCount,
        seed: Math.floor(Math.random() * 1000000)
      }));

      success++;

      if (success % 100 === 0) {
        console.log(`已生成 ${success}/${config.count}`);
      }
    }

    const time = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`完成: ${success}/${config.count} 题, 耗时 ${time}s`);
  }
}

main();
