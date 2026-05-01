/**
 * ============================================================================
 * 一笔画（One-Stroke）题目批量生成器 v2.1
 * ============================================================================
 *
 * 算法改进思路（用户原始思路修正）：
 * 1. 随机起点
 * 2. 边走边：50%概率停下来，在未访问的格子里随机加洞（至少加minHoles个）
 * 3. 加完洞后，从当前位置继续走，形成完整路径（路径A + 路径B）
 * 4. 最终：走过的 = 答案，没走过的 = 洞
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 4, maxHoles: 6, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 10, maxHoles: 13, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 15, maxHoles: 18, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');
const MAX_START_ATTEMPTS = 100;

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

function logGrid(rows, cols, visited, holes, current, path, step) {
  const holeSet = new Set(holes);
  const pathSet = new Set(path);

  console.log(`\n[Step ${step}] 当前状态:`);
  console.log(`  路径长度: ${path.length}, 洞数量: ${holes.length}`);

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
      } else if (cell === current) {
        line += '  ►  ║';
      } else if (visited[cell]) {
        line += '  ○  ║';
      } else {
        line += '  .  ║';
      }
    }
    console.log(line);
    console.log(line1);
  }
  console.log('  图例: ██=洞 [XX]=路径 ►=当前位置 . = 未访问');
}

function generateWalkWithHoles(rows, cols, minHoles, maxHoles, enableLog = false) {
  const total = rows * cols;
  const visited = new Uint8Array(total);
  const holes = new Set();
  const path = [];

  const start = Math.floor(Math.random() * total);
  visited[start] = 1;
  path.push(start);

  let current = start;
  let step = 0;

  if (enableLog) {
    console.log(`\n========== 开始生成 ==========`);
    console.log(`起点: ${start}, 目标洞数: ${minHoles}-${maxHoles}`);
  }

  // 第一阶段：边走边加洞，直到加够至少minHoles个
  while (holes.size < minHoles) {
    step++;
    const unvisitedNeighbors = getUnvisitedNeighbors(current, rows, cols, visited, holes);

    if (unvisitedNeighbors.length === 0) {
      if (enableLog) console.log(`[Step ${step}] 走到 ${current} 后无路可走，需要重来`);
      return null;
    }

    const scored = unvisitedNeighbors.map(n => ({
      cell: n,
      score: countAvailableNeighbors(n, rows, cols, visited, holes)
    }));
    scored.sort((a, b) => a.score - b.score);

    const minScore = scored[0].score;
    const bestNeighbors = scored.filter(s => s.score === minScore).map(s => s.cell);
    shuffle(bestNeighbors);

    current = bestNeighbors[0];
    visited[current] = 1;
    path.push(current);

    if (enableLog && step % 5 === 0) {
      console.log(`[Step ${step}] 走到 ${current}, 路径长度: ${path.length}`);
    }

    // 50%概率加一个洞（在未访问格子中随机选）
    if (Math.random() < 0.5 && holes.size < maxHoles) {
      const unvisitedCells = [];
      for (let i = 0; i < total; i++) {
        if (!visited[i] && !holes.has(i)) {
          unvisitedCells.push(i);
        }
      }

      if (unvisitedCells.length > 0) {
        shuffle(unvisitedCells);
        const hole = unvisitedCells[0];
        holes.add(hole);

        if (enableLog && step % 5 === 0) {
          console.log(`[Step ${step}] 添加洞 ${hole} (共${holes.size}个)`);
        }
      }
    }
  }

  if (enableLog) {
    console.log(`\n========== 第一阶段完成，已加 ${holes.size} 个洞 ==========`);
    logGrid(rows, cols, visited, [...holes], current, path, 'phase1');
  }

  // 第二阶段：继续走完剩下的格子
  if (enableLog) console.log(`\n========== 开始第二阶段 ==========`);
  while (true) {
    step++;
    const unvisitedNeighbors = getUnvisitedNeighbors(current, rows, cols, visited, holes);

    if (unvisitedNeighbors.length === 0) {
      if (enableLog) console.log(`[Step ${step}] 无路可走，第二阶段完成`);
      break;
    }

    const scored = unvisitedNeighbors.map(n => ({
      cell: n,
      score: countAvailableNeighbors(n, rows, cols, visited, holes)
    }));
    scored.sort((a, b) => a.score - b.score);

    const minScore = scored[0].score;
    const bestNeighbors = scored.filter(s => s.score === minScore).map(s => s.cell);
    shuffle(bestNeighbors);

    current = bestNeighbors[0];
    visited[current] = 1;
    path.push(current);
  }

  // 统计最终的洞：所有没被路径覆盖的格子
  const finalHoles = [];
  const pathSet = new Set(path);
  for (let i = 0; i < total; i++) {
    if (!pathSet.has(i)) {
      finalHoles.push(i);
    }
  }

  if (enableLog) {
    console.log(`\n========== 最终结果 ==========`);
    console.log(`路径长度: ${path.length}`);
    console.log(`洞数: ${finalHoles.length}`);
    console.log(`总格子数: ${total}, 路径+洞: ${path.length + finalHoles.length}`);
    logGrid(rows, cols, visited, finalHoles, current, path, 'final');
  }

  // 验证洞的数量在要求范围内
  if (finalHoles.length >= minHoles && finalHoles.length <= maxHoles) {
    if (enableLog) console.log(`\n✅ 生成成功! 洞数: ${finalHoles.length}`);
    return { rows, cols, holes: finalHoles, answer: path };
  } else {
    if (enableLog) console.log(`\n❌ 洞数不符合要求: ${finalHoles.length}, 目标: ${minHoles}-${maxHoles}`);
    return null;
  }
}

function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generateWalkWithHoles(rows, cols, minHoles, maxHoles, false);

    if (result && result.holes.length >= minHoles && result.holes.length <= maxHoles && result.answer.length >= 2) {
      return result;
    }
  }

  return null;
}

function generateAll() {
  console.log('开始生成 one-stroke 题目 (v2.1)...\n');

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

      const puzzle = generatePuzzle(config.rows, config.cols, config.minHoles, config.maxHoles);

      const endTime = Date.now();
      difficultyTime += (endTime - startTime);

      if (puzzle && puzzle.holes && puzzle.answer) {
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
      } else {
        fail++;
      }
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

  const config = DIFFICULTIES.easy;
  const result = generateWalkWithHoles(config.rows, config.cols, config.minHoles, config.maxHoles, true);

  if (result) {
    console.log('\n========== 最终结果 ==========');
    console.log(`洞数: ${result.holes.length}`);
    console.log(`路径长度: ${result.answer.length}`);
    console.log(`起点: ${result.answer[0]}`);
    console.log(`终点: ${result.answer[result.answer.length - 1]}`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--test')) {
  testWithLog();
} else {
  generateAll();
}