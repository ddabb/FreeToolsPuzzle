/**
 * ============================================================================
 * 一笔画（One-Stroke）题目批量生成器 v2
 * ============================================================================
 *
 * 算法改进思路（用户提出）：
 * 1. 走一步时，50%概率在未访问位置随机加一个洞
 * 2. 加完最小洞数后形成路径A，存储当前状态
 * 3. 剩下的棋盘找一条最大路径形成路径B（起点在路径A的起点和终点附近）
 * 4. 路径A和路径B拼接起来
 * 5. 路径A和路径B之后的点变成洞
 *
 * 优势：洞更分散，且保证有解
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

function getUnvisitedNeighbors(cell, rows, cols, visited) {
  const neighbors = getNeighbors(cell, rows, cols);
  return neighbors.filter(n => !visited[n]);
}

function countAvailableNeighbors(cell, rows, cols, visited) {
  return getUnvisitedNeighbors(cell, rows, cols, visited).length;
}

function logGrid(rows, cols, visited, holes, current, pathA, step, pathB = []) {
  const holeSet = new Set(holes);
  const pathASet = new Set(pathA);
  const pathBSet = new Set(pathB);

  console.log(`\n[Step ${step}] 当前状态:`);
  console.log(`  路径A长度: ${pathA.length}, 路径B长度: ${pathB.length}, 洞数量: ${holes.length}`);

  const line1 = '═'.repeat(cols * 6 + 1);
  console.log(line1);

  for (let r = 0; r < rows; r++) {
    let line = '║';
    for (let c = 0; c < cols; c++) {
      const cell = r * cols + c;
      if (holeSet.has(cell)) {
        line += '  ██ ║';
      } else if (pathASet.has(cell)) {
        const idx = pathA.indexOf(cell);
        line += `[${idx.toString().padStart(2, '0')}]║`;
      } else if (pathBSet.has(cell)) {
        line += '  ●  ║';
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
  console.log('  图例: ██=洞 [XX]=路径A ●=路径B ○=已访问 ►=当前位置 .=未访问');
}

function generatePathAWithHoles(rows, cols, minHoles, maxHoles, enableLog = false) {
  const total = rows * cols;
  const visited = new Uint8Array(total);
  const holes = [];
  const path = [];

  const start = Math.floor(Math.random() * total);
  visited[start] = 1;
  path.push(start);

  let current = start;
  let holesAdded = 0;
  let step = 0;

  if (enableLog) {
    console.log(`\n========== 生成路径A ==========`);
    console.log(`起点: ${start}, 目标洞数: ${minHoles}-${maxHoles}`);
  }

  while (true) {
    step++;
    const unvisitedNeighbors = getUnvisitedNeighbors(current, rows, cols, visited);

    if (unvisitedNeighbors.length === 0) {
      if (enableLog) console.log(`[Step ${step}] 走到 ${current} 后无路可走，路径A终止`);
      break;
    }

    const scored = unvisitedNeighbors.map(n => ({
      cell: n,
      score: countAvailableNeighbors(n, rows, cols, visited)
    }));
    scored.sort((a, b) => a.score - b.score);

    const minScore = scored[0].score;
    const bestNeighbors = scored.filter(s => s.score === minScore).map(s => s.cell);
    shuffle(bestNeighbors);

    current = bestNeighbors[0];
    visited[current] = 1;
    path.push(current);

    if (enableLog) {
      console.log(`[Step ${step}] 走到 ${current}, 剩余可走: ${unvisitedNeighbors.length}`);
    }

    if (holesAdded < maxHoles && Math.random() < 0.5) {
      const unvisitedCells = [];
      for (let i = 0; i < total; i++) {
        if (!visited[i] && !holes.includes(i)) {
          unvisitedCells.push(i);
        }
      }

      if (unvisitedCells.length > 0) {
        shuffle(unvisitedCells);
        const hole = unvisitedCells[Math.floor(Math.random() * unvisitedCells.length)];
        holes.push(hole);
        holesAdded++;

        if (enableLog) {
          console.log(`[Step ${step}] 添加洞 ${hole} (共${holes.length}个)`);
        }

        if (holesAdded >= minHoles) {
          if (enableLog) console.log(`[Step ${step}] 已达最小洞数 ${minHoles}，路径A完成`);
          break;
        }
      }
    }
  }

  if (enableLog) {
    logGrid(rows, cols, visited, holes, current, path, 'A完成');
  }

  return { path, holes, visited, lastCell: current };
}

function generatePathBFromEndpoint(rows, cols, pathAVisited, pathAEndpoints, holes, enableLog = false) {
  const total = rows * cols;
  const combinedVisited = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    combinedVisited[i] = pathAVisited[i];
  }
  const path = [];

  const [startA, endA] = pathAEndpoints;

  const neighborsA = getNeighbors(endA, rows, cols);
  const validStarts = neighborsA.filter(n =>
    !holes.includes(n) &&
    !combinedVisited[n]
  );

  if (validStarts.length === 0) {
    if (enableLog) console.log(`[PathB] 无法从路径A终点找到有效起点`);
    return { path: [], visited: combinedVisited };
  }

  shuffle(validStarts);
  let current = validStarts[0];

  combinedVisited[current] = 1;
  path.push(current);

  if (enableLog) {
    console.log(`\n========== 生成路径B ==========`);
    console.log(`起点: ${current} (在路径A终点 ${endA} 附近)`);
  }

  let step = 0;
  while (true) {
    step++;
    const unvisitedNeighbors = getUnvisitedNeighbors(current, rows, cols, combinedVisited);

    if (unvisitedNeighbors.length === 0) {
      if (enableLog) console.log(`[PathB Step ${step}] 无路可走，路径B终止`);
      break;
    }

    const scored = unvisitedNeighbors.map(n => ({
      cell: n,
      score: countAvailableNeighbors(n, rows, cols, combinedVisited)
    }));
    scored.sort((a, b) => a.score - b.score);

    const minScore = scored[0].score;
    const bestNeighbors = scored.filter(s => s.score === minScore).map(s => s.cell);
    shuffle(bestNeighbors);

    current = bestNeighbors[0];
    combinedVisited[current] = 1;
    path.push(current);

    if (enableLog && step <= 10) {
      console.log(`[PathB Step ${step}] 走到 ${current}`);
    }
  }

  if (enableLog) {
    console.log(`[PathB] 完成，路径B长度: ${path.length}`);
  }

  return { path, visited: combinedVisited };
}

function generateWalkAndDigV2(rows, cols, minHoles, maxHoles, enableLog = false) {
  const total = rows * cols;

  for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt++) {
    if (enableLog) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`尝试 #${attempt + 1}`);
      console.log('='.repeat(50));
    }

    const { path: pathA, holes, visited: visitedA, lastCell } =
      generatePathAWithHoles(rows, cols, minHoles, maxHoles, enableLog);

    if (holes.length < minHoles) {
      if (enableLog) console.log(`洞数不足，继续行走...`);
      continue;
    }

    const pathAEndpoints = [pathA[0], pathA[pathA.length - 1]];

    const { path: pathB, visited: visitedCombined } =
      generatePathBFromEndpoint(rows, cols, visitedA, pathAEndpoints, holes, enableLog);

    const fullPath = [...pathA, ...pathB];
    const pathSet = new Set(fullPath);

    const finalHoles = [...holes];
    for (let i = 0; i < total; i++) {
      if (!pathSet.has(i) && !finalHoles.includes(i)) {
        finalHoles.push(i);
      }
    }

    if (enableLog) {
      console.log(`\n========== 合并结果 ==========`);
      console.log(`路径A长度: ${pathA.length}`);
      console.log(`路径B长度: ${pathB.length}`);
      console.log(`合并后总路径长度: ${fullPath.length}`);
      console.log(`路径去重后长度: ${pathSet.size}`);
      console.log(`路径A的洞数: ${holes.length}`);
      console.log(`额外洞数: ${finalHoles.length - holes.length}`);
      console.log(`总洞数: ${finalHoles.length}`);
      console.log(`总格子数: ${total}, 路径+洞: ${pathSet.size + finalHoles.length}`);
    }

    if (finalHoles.length >= minHoles && finalHoles.length <= maxHoles) {
      if (enableLog) {
        console.log(`\n✅ 生成成功! 洞数: ${finalHoles.length}, 路径长度: ${pathSet.size}`);
      }
      return { rows, cols, holes: finalHoles, answer: fullPath };
    } else if (enableLog) {
      console.log(`\n❌ 验证失败: 洞数=${finalHoles.length}, 目标=${minHoles}-${maxHoles}`);
    }
  }

  if (enableLog) console.log(`❌ 达到最大尝试次数`);

  return null;
}

function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = generateWalkAndDigV2(rows, cols, minHoles, maxHoles, false);

    if (result && result.holes.length >= minHoles && result.holes.length <= maxHoles && result.answer.length >= 2) {
      return result;
    }
  }

  return null;
}

function generateAll() {
  console.log('开始生成 one-stroke 题目 (v2)...\n');

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
  const result = generateWalkAndDigV2(config.rows, config.cols, config.minHoles, config.maxHoles, true);

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