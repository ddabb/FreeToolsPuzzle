/**
 * ============================================================================
 * 一笔画（One-Stroke）题目批量生成器 v3 (修正版)
 * ============================================================================
 *
 * 算法思路：
 * 1. 先随机在棋盘上放置 a 个洞
 * 2. 在剩余格子上用 Warnsdorff 找最长路径 b
 * 3. 剩余访问不到的格子 = c
 * 4. 最终洞 = a + c，路径 = b
 * 5. 验证：a + b + c = 总格子数
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 4, maxHoles: 6, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 6, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 4, maxHoles: 6, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');
const MAX_ATTEMPTS = 100;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNeighbors(cell, rows, cols) {
  const r = Math.floor(cell / cols);
  const c = cell % cols;
  const neighbors = [];

  if (r > 0) neighbors.push(cell - cols);
  if (r < rows - 1) neighbors.push(cell + cols);
  if (c > 0) neighbors.push(cell - 1);
  if (c < cols - 1) neighbors.push(cell + 1);

  return neighbors;
}

function getUnvisitedNeighbors(cell, rows, cols, visited, holes) {
  const neighbors = getNeighbors(cell, rows, cols);
  return neighbors.filter(n => !visited[n] && !holes.has(n));
}

function countAvailableNeighbors(cell, rows, cols, visited, holes) {
  return getUnvisitedNeighbors(cell, rows, cols, visited, holes).length;
}

function logGrid(rows, cols, visited, holes, path, label) {
  const holeSet = new Set(holes);
  const pathSet = new Set(path);

  console.log(`\n${label}:`);
  console.log(`  路径长度: ${path.length}, 洞数量: ${holeSet.size}`);

  const line1 = '═'.repeat(cols * 6 + 1);
  console.log(line1);

  for (let r = 0; r < rows; r++) {
    let line = '║';
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      if (holeSet.has(cell)) {
        line += '  ██ ║';
      } else if (pathSet.has(cell)) {
        const idx = path.indexOf(cell);
        line += `[${idx.toString().padStart(2, '0')}]║`;
      } else {
        line += '  .  ║';
      }
    }
    console.log(line);
    console.log(line1);
  }
  console.log('  图例: ██=洞 [XX]=路径 .=未访问');
}

function generatePuzzleV3(rows, cols, minHoles, maxHoles, enableLog = false) {
  const total = rows * cols;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (enableLog) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`尝试 #${attempt + 1}`);
      console.log('='.repeat(50));
    }

    const initialHoles = new Set();

    const a = minHoles + Math.floor(Math.random() * (maxHoles - minHoles + 1));

    if (enableLog) console.log(`\n第1步：随机放置 ${a} 个初始洞`);

    while (initialHoles.size < a) {
      const cell = Math.floor(Math.random() * total);
      initialHoles.add(cell);
    }

    if (enableLog) {
      console.log(`  初始洞位置: ${[...initialHoles].sort((x, y) => x - y).join(', ')}`);
    }

    if (enableLog) console.log(`\n第2步：在剩余格子上用 Warnsdorff 找最长路径`);

    const visited = new Uint8Array(total);
    const nonHoleCells = [];
    for (let i = 0; i < total; i++) {
      if (!initialHoles.has(i)) {
        nonHoleCells.push(i);
      }
    }

    if (nonHoleCells.length === 0) {
      if (enableLog) console.log(`  没有可走的格子！`);
      continue;
    }

    shuffle(nonHoleCells);
    let start = nonHoleCells[0];
    visited[start] = 1;
    const path = [start];
    let current = start;

    if (enableLog) console.log(`  起点: ${start}`);

    while (true) {
      const unvisitedNeighbors = getUnvisitedNeighbors(current, rows, cols, visited, initialHoles);

      if (unvisitedNeighbors.length === 0) {
        if (enableLog) console.log(`  无路可走，路径完成`);
        break;
      }

      const scored = unvisitedNeighbors.map(n => ({
        cell: n,
        score: countAvailableNeighbors(n, rows, cols, visited, initialHoles)
      }));
      scored.sort((a, b) => a.score - b.score);

      const minScore = scored[0].score;
      const bestNeighbors = scored.filter(s => s.score === minScore).map(s => s.cell);
      shuffle(bestNeighbors);

      current = bestNeighbors[0];
      visited[current] = 1;
      path.push(current);
    }

    const b = path.length;

    if (enableLog) {
      console.log(`  路径长度 b = ${b}`);
    }

    if (enableLog) console.log(`\n第3步：计算剩余格子 c`);

    let c = 0;
    for (let i = 0; i < total; i++) {
      if (!visited[i] && !initialHoles.has(i)) {
        c++;
      }
    }

    const finalHoles = [];
    for (let i = 0; i < total; i++) {
      if (!visited[i]) {
        finalHoles.push(i);
      }
    }

    if (enableLog) {
      console.log(`  a (初始洞): ${a}`);
      console.log(`  b (路径长度): ${b}`);
      console.log(`  c (未被路径覆盖的非初始洞格子): ${c}`);
      console.log(`  a + b + c = ${a} + ${b} + ${c} = ${a + b + c} (总格子: ${total})`);
      console.log(`  最终洞数 = a + c = ${a} + ${c} = ${a + c}`);

      const verification = a + b + c;
      if (verification === total) {
        console.log(`  ✅ 验证通过: a + b + c = 总格子数`);
      } else {
        console.log(`  ❌ 验证失败: a + b + c = ${verification}, 总格子 = ${total}`);
      }

      logGrid(rows, cols, visited, finalHoles, path, '最终网格');
    }

    const totalHoles = finalHoles.length;
    if (totalHoles >= minHoles && totalHoles <= maxHoles) {
      if (enableLog) {
        console.log(`\n✅ 生成成功! 最终洞数: ${totalHoles}, 路径长度: ${b}`);
      }
      return { rows, cols, holes: finalHoles, answer: path };
    } else {
      if (enableLog) {
        console.log(`\n❌ 洞数不符合要求: ${totalHoles}, 目标: ${minHoles}-${maxHoles}`);
      }
    }
  }

  return null;
}

function generateAll() {
  console.log('开始生成 one-stroke 题目 (v3)...\n');

  ensureDir(OUTPUT_DIR);

  let total = 0;
  let totalTime = 0;

  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    console.log(`生成 ${difficulty} 难度 (${config.rows}x${config.cols}, ${config.minHoles}-${config.maxHoles}洞)...`);

    let success = 0;
    let fail = 0;
    let difficultyTime = 0;

    for (let i = 1; i <= config.count; i++) {
      const startTime = Date.now();

      let puzzle = null;
      while (!puzzle) {
        puzzle = generatePuzzleV3(config.rows, config.cols, config.minHoles, config.maxHoles, false);
      }

      const endTime = Date.now();
      difficultyTime += (endTime - startTime);

      const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
      const filepath = path.join(OUTPUT_DIR, filename);

      const data = {
        size: config.rows,
        row: puzzle.row,
        col: puzzle.col,
        holes: puzzle.holes.sort((a, b) => a - b),
        answer: puzzle.answer,
        difficulty: difficulty,
        id: i
      };

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      success++;
    }

    const avgTime = difficultyTime / config.count;
    console.log(`  成功: ${success}, 失败: ${fail}, 平均耗时: ${avgTime.toFixed(2)}ms, 本轮总耗时: ${(difficultyTime / 1000).toFixed(2)}s\n`);

    total += success;
    totalTime += difficultyTime;
  }

  console.log(`完成！共生成 ${total} 个题目`);
  console.log(`总耗时: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

function testWithLog() {
  console.log('\n========== 测试模式：生成单个题目并显示详细日志 ==========\n');

  const config = DIFFICULTIES.medium;
  const result = generatePuzzleV3(config.rows, config.cols, config.minHoles, config.maxHoles, true);

  if (result) {
    console.log('\n========== 最终结果 ==========');
    console.log(`洞数: ${result.holes.length}`);
    console.log(`路径长度: ${result.answer.length}`);
    console.log(`起点: ${result.answer[0]}`);
    console.log(`终点: ${result.answer[result.answer.length - 1]}`);
  } else {
    console.log('\n生成失败！');
  }
}

const args = process.argv.slice(2);
if (args.includes('--test')) {
  testWithLog();
} else {
  generateAll();
}