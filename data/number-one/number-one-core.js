/**
 * 数壹（Hitori）核心算法 v5
 * 修复版：真正拉丁方 + 正确求解器 + 不暴露答案的棋盘
 *
 * 数壹规则：
 * 1. 涂黑一些格子，使得每行每列没有重复数字
 * 2. 黑格不能相邻（含对角线）
 * 3. 所有未涂黑的格子必须连通
 */

const ALL_DIR = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const FOUR_DIR = [[-1,0],[1,0],[0,-1],[0,1]];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 生成真正的拉丁方（行列均1..N不重复）
 */
function generateLatinSquare(size) {
  // 循环法 + 随机置换
  const board = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(((c + r) % size) + 1);
    }
    board.push(row);
  }
  // 打乱行
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  // 打乱列
  for (let c = size - 1; c > 0; c--) {
    const j = Math.floor(Math.random() * (c + 1));
    for (let r = 0; r < size; r++) {
      [board[r][c], board[r][j]] = [board[r][j], board[r][c]];
    }
  }
  // 数字随机置换
  const perm = shuffle(Array.from({length: size}, (_, i) => i + 1));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      board[r][c] = perm[board[r][c] - 1];
    }
  }
  return board;
}

/**
 * 生成随机黑格（不相邻+白格连通）
 */
function generateRandomBlackCells(size, ratioLo, ratioHi) {
  const total = size * size;
  for (let t = 0; t < 800; t++) {
    const ratio = ratioLo + Math.random() * (ratioHi - ratioLo);
    const n = Math.max(1, Math.floor(total * ratio));
    const blackSet = new Set();
    const indices = shuffle(Array.from({ length: total }, (_, i) => i));
    for (const idx of indices) {
      if (blackSet.size >= n) break;
      const r = Math.floor(idx / size), c = idx % size;
      const key = r * size + c;
      let adj = false;
      for (const [dr, dc] of ALL_DIR) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && blackSet.has(nr * size + nc)) { adj = true; break; }
      }
      if (!adj) blackSet.add(key);
    }

    // BFS连通性
    const whiteCount = total - blackSet.size;
    let startKey = -1;
    for (let k = 0; k < total; k++) {
      if (!blackSet.has(k)) { startKey = k; break; }
    }
    if (startKey < 0) continue;
    const visited = new Set([startKey]);
    const queue = [startKey];
    while (queue.length) {
      const k = queue.shift();
      const r = Math.floor(k / size), c = k % size;
      for (const [dr, dc] of FOUR_DIR) {
        const nr = r + dr, nc = c + dc, nk = nr * size + nc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !blackSet.has(nk) && !visited.has(nk)) {
          visited.add(nk); queue.push(nk);
        }
      }
    }
    if (visited.size === whiteCount) {
      return Array.from(blackSet).map(k => ({ r: Math.floor(k / size), c: k % size }));
    }
  }
  return null;
}

/**
 * 求解数壹：找所有满足条件的黑格集合
 * 正确版：检查行列白格不重复 + 黑格不相邻 + 白格连通
 */
function solve(board, size, maxSolutions = 2) {
  const N = size;
  const total = N * N;
  const solutions = [];

  // 跟踪每行每列已被白格占用的数字
  const rowUsed = Array.from({length: N}, () => new Set());
  const colUsed = Array.from({length: N}, () => new Set());
  const blackSet = new Set();
  const blackCells = [];

  function isAdjacent(r, c) {
    for (const [dr, dc] of ALL_DIR) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && blackSet.has(nr * N + nc)) return true;
    }
    return false;
  }

  function isConnected() {
    const whiteCount = total - blackSet.size;
    if (whiteCount === 0) return false;
    let startKey = -1;
    for (let k = 0; k < total; k++) {
      if (!blackSet.has(k)) { startKey = k; break; }
    }
    if (startKey < 0) return false;
    const visited = new Set([startKey]);
    const queue = [startKey];
    while (queue.length) {
      const k = queue.shift();
      const r = Math.floor(k / N), c = k % N;
      for (const [dr, dc] of FOUR_DIR) {
        const nr = r + dr, nc = c + dc, nk = nr * N + nc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !blackSet.has(nk) && !visited.has(nk)) {
          visited.add(nk); queue.push(nk);
        }
      }
    }
    return visited.size === whiteCount;
  }

  function backtrack(idx) {
    if (solutions.length >= maxSolutions) return;
    if (idx === total) {
      if (isConnected()) {
        solutions.push(blackCells.map(c => ({...c})));
      }
      return;
    }

    const r = Math.floor(idx / N);
    const c = idx % N;
    const v = board[r][c];
    const canBeWhite = !rowUsed[r].has(v) && !colUsed[c].has(v);
    const canBeBlack = !isAdjacent(r, c);

    if (!canBeWhite && !canBeBlack) return; // 无解，剪枝

    // 优先尝试白格（更多约束传播）
    if (canBeWhite) {
      rowUsed[r].add(v);
      colUsed[c].add(v);
      backtrack(idx + 1);
      rowUsed[r].delete(v);
      colUsed[c].delete(v);
    }

    if (solutions.length >= maxSolutions) return;

    if (canBeBlack) {
      blackSet.add(r * N + c);
      blackCells.push({r, c});
      backtrack(idx + 1);
      blackCells.pop();
      blackSet.delete(r * N + c);
    }
  }

  backtrack(0);
  return solutions;
}

/**
 * 验证解
 */
function isValidSolution(board, blackCells, size) {
  const N = size;
  const blackS = new Set(blackCells.map(c => c.r * N + c.c));
  
  // 黑格不相邻
  for (const c of blackCells) {
    for (const [dr, dc] of ALL_DIR) {
      const nr = c.r + dr, nc = c.c + dc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && blackS.has(nr * N + nc)) return false;
    }
  }
  
  // 白格行列不重复
  for (let r = 0; r < N; r++) {
    const seen = new Set();
    for (let c = 0; c < N; c++) {
      if (!blackS.has(r * N + c)) {
        if (seen.has(board[r][c])) return false;
        seen.add(board[r][c]);
      }
    }
  }
  for (let c = 0; c < N; c++) {
    const seen = new Set();
    for (let r = 0; r < N; r++) {
      if (!blackS.has(r * N + c)) {
        if (seen.has(board[r][c])) return false;
        seen.add(board[r][c]);
      }
    }
  }
  
  // 白格连通
  const whiteCount = N * N - blackCells.length;
  let startKey = -1;
  for (let k = 0; k < N * N; k++) {
    if (!blackS.has(k)) { startKey = k; break; }
  }
  if (startKey < 0) return false;
  const visited = new Set([startKey]);
  const queue = [startKey];
  while (queue.length) {
    const k = queue.shift();
    const r = Math.floor(k / N), c = k % N;
    for (const [dr, dc] of FOUR_DIR) {
      const nr = r + dr, nc = c + dc, nk = nr * N + nc;
      if (nr >= 0 && nr < N && nc >= 0 && nc < N && !blackS.has(nk) && !visited.has(nk)) {
        visited.add(nk); queue.push(nk);
      }
    }
  }
  return visited.size === whiteCount;
}

/**
 * 生成谜题
 * 方法：生成拉丁方 → 选择答案黑格 → 修改黑格值创建重复 → 验证唯一解
 */
function generate(size = 6, difficulty = 2) {
  const diffParams = {
    1: { blackRatio: [0.15, 0.25] },
    2: { blackRatio: [0.20, 0.35] },
    3: { blackRatio: [0.25, 0.42] }
  };
  const { blackRatio } = diffParams[difficulty] || diffParams[2];
  const maxAttempts = difficulty === 1 ? 300 : difficulty === 2 ? 500 : 800;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. 生成真正拉丁方
    const latin = generateLatinSquare(size);
    
    // 2. 生成答案黑格（不相邻 + 白格连通）
    const answerBlacks = generateRandomBlackCells(size, blackRatio[0], blackRatio[1]);
    if (!answerBlacks) continue;
    const answerSet = new Set(answerBlacks.map(c => `${c.r},${c.c}`));
    
    // 3. 创建谜题棋盘（从拉丁方拷贝）
    const board = latin.map(row => [...row]);
    
    // 4. 修改黑格的值，使其与同行/列白格的值重复，创造解题线索
    for (const cell of answerBlacks) {
      const { r, c } = cell;
      const candidates = [];
      // 收集同行白格的值
      for (let cc = 0; cc < size; cc++) {
        if (cc !== c && !answerSet.has(`${r},${cc}`)) candidates.push(board[r][cc]);
      }
      // 收集同列白格的值
      for (let rr = 0; rr < size; rr++) {
        if (rr !== r && !answerSet.has(`${rr},${c}`)) candidates.push(board[rr][c]);
      }
      if (candidates.length > 0) {
        board[r][c] = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    
    // 5. 验证唯一解
    const solutions = solve(board, size, 2);
    if (solutions.length === 1) {
      const sol = solutions[0];
      return {
        board,
        solution: sol.map(c => `${c.r},${c.c}`),
        difficulty,
        size,
        blackCount: sol.length,
        blackRatio: Math.round(sol.length / (size * size) * 100)
      };
    }
  }
  return null;
}

/**
 * 批量生成
 */
function generateBatch(count, size = 6, difficulty = 2) {
  const puzzles = [];
  const start = Date.now();
  let fails = 0;
  for (let i = 0; i < count; i++) {
    const puzzle = generate(size, difficulty);
    if (puzzle) {
      puzzle.id = puzzles.length + 1;
      puzzles.push(puzzle);
      process.stdout.write(`\r✓ ${puzzles.length}/${count} fail=${fails} time=${Math.round((Date.now()-start)/1000)}s`);
    } else {
      fails++;
      if (fails % 50 === 0) process.stdout.write(` (fail×${fails})`);
    }
    if (fails > count * 10) { console.log('\n失败过多，停止'); break; }
  }
  console.log(`\n完成：${puzzles.length}/${count}个，失败${fails}次，${Math.round((Date.now()-start)/1000)}s`);
  return puzzles;
}

module.exports = { solve, generate, generateBatch, isValidSolution,
  hasUniqueSolution: (b, s) => solve(b, s, 2).length === 1,
  getUniqueSolution: (b, s) => { const x = solve(b, s, 2); return x.length === 1 ? x[0] : null; }
};
