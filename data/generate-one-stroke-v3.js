/**
 * 一笔画题目生成器 v3 - 增量版
 * - 跳过已存在的文件
 * - 优化算法：更好的Warnsdorff + 多种起始策略
 */

const fs = require('fs');
const path = require('path');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 2, maxHoles: 8, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 15, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 6, maxHoles: 25, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');

// 获取已存在的文件列表
function getExistingIds(difficulty) {
  const dir = OUTPUT_DIR;
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs.readdirSync(dir)
      .filter(f => f.startsWith(difficulty + '-') && f.endsWith('.json'))
      .map(f => parseInt(f.replace(difficulty + '-', '').replace('.json', '')))
  );
}

// ============================================================
// 路径生成器
// ============================================================
class PathGen {
  constructor(rows, cols, targetCells) {
    this.rows = rows;
    this.cols = cols;
    this.total = rows * cols;
    this.target = targetCells;
  }

  nbrs(cell) {
    const r = (cell / this.cols) | 0, c = cell % this.cols;
    return [
      r > 0 ? cell - this.cols : -1,
      r < this.rows - 1 ? cell + this.cols : -1,
      c > 0 ? cell - 1 : -1,
      c < this.cols - 1 ? cell + 1 : -1
    ].filter(x => x >= 0);
  }

  // 启发式排序：优先后继少的（Warnsdorff），平局时随机
  sortNbrs(cell, visited) {
    return this.nbrs(cell)
      .filter(n => !visited[n])
      .map(n => {
        const next = this.nbrs(n).filter(nn => !visited[nn]).length;
        return { n, next };
      })
      .sort((a, b) => a.next - b.next || Math.random() - 0.5)
      .map(x => x.n);
  }

  // 尝试从指定起点生成路径
  tryFrom(start, maxBack) {
    const visited = new Uint8Array(this.total);
    const path = [start];
    visited[start] = 1;
    let backtrack = 0;

    const dfs = (depth) => {
      if (depth === this.target) return true;
      if (++backtrack > maxBack) return false;

      const cell = path[depth - 1];
      const ordered = this.sortNbrs(cell, visited);

      for (const next of ordered) {
        visited[next] = 1;
        path[depth] = next;
        if (dfs(depth + 1)) return true;
        visited[next] = 0;
      }
      return false;
    };

    if (dfs(1)) return path.slice();
    return null;
  }

  // 多策略生成
  generate(maxAttempts, maxBack) {
    // 策略1: 从角落/边缘开始（更容易找到长路径）
    const corners = [0, this.cols - 1, this.total - this.cols, this.total - 1];
    const edges = [];
    for (let c = 0; c < this.cols; c++) {
      if (!corners.includes(c)) edges.push(c);
      if (!corners.includes(this.total - this.cols + c)) edges.push(this.total - this.cols + c);
    }
    for (let r = 1; r < this.rows - 1; r++) {
      if (!corners.includes(r * this.cols)) edges.push(r * this.cols);
      if (!corners.includes(r * this.cols + this.cols - 1)) edges.push(r * this.cols + this.cols - 1);
    }

    const strategies = [
      ...corners.sort(() => Math.random() - 0.5),
      ...edges.sort(() => Math.random() - 0.5),
      ...Array.from({ length: this.total }, (_, i) => i).sort(() => Math.random() - 0.5)
    ];

    for (let i = 0; i < Math.min(maxAttempts, strategies.length); i++) {
      const result = this.tryFrom(strategies[i], maxBack);
      if (result) return result;
    }

    // 策略2: 纯随机重试
    for (let i = 0; i < Math.min(50, maxAttempts); i++) {
      const start = Math.floor(Math.random() * this.total);
      const result = this.tryFrom(start, maxBack);
      if (result) return result;
    }

    return null;
  }
}

// 生成单个题目
function generateOne(rows, cols, minH, maxH) {
  const total = rows * cols;
  const maxAttempts = total <= 36 ? 100 : total <= 64 ? 300 : 600;
  const maxBack = total <= 36 ? 5000 : total <= 64 ? 30000 : 150000;

  // 洞数从多到少尝试（路径短=容易找到）
  const holes = [];
  for (let h = maxH; h >= minH; h--) holes.push(h);
  // 随机打乱
  for (let i = holes.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [holes[i], holes[j]] = [holes[j], holes[i]];
  }

  for (const h of holes) {
    const target = total - h;
    const gen = new PathGen(rows, cols, target);
    const answer = gen.generate(maxAttempts, maxBack);

    if (answer && answer.length === target) {
      const pathSet = new Set(answer);
      const holesArr = [];
      for (let i = 0; i < total; i++) {
        if (!pathSet.has(i)) holesArr.push(i);
      }
      return { holes: holesArr, answer };
    }
  }
  return null;
}

// ============================================================
// 主逻辑
// ============================================================
function main() {
  console.log('一笔画生成器 v3 - 增量版\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const startTime = Date.now();
  let totalGen = 0;

  for (const [diff, cfg] of Object.entries(DIFFICULTIES)) {
    const existing = getExistingIds(diff);
    const need = cfg.count - existing.size;

    console.log(`\n${diff}: 已有${existing.size}/${cfg.count}个，需生成${need}个`);

    if (need === 0) {
      console.log('  ✓ 全部完成，跳过');
      continue;
    }

    let gen = 0, fail = 0;
    for (let id = 1; id <= cfg.count && gen < need; id++) {
      if (existing.has(id)) continue;

      const result = generateOne(cfg.rows, cfg.cols, cfg.minHoles, cfg.maxHoles);

      if (result) {
        const puzzle = {
          size: cfg.rows, row: cfg.rows, col: cfg.cols,
          holes: result.holes, difficulty: diff, id, answer: result.answer
        };
        const filename = `${diff}-${String(id).padStart(4, '0')}.json`;
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(puzzle, null, 2));
        gen++;
        totalGen++;

        if (gen % 100 === 0) {
          process.stdout.write(`${gen} `);
        }
      } else {
        fail++;
        if (fail <= 5) console.log(`  [${id} 生成失败]`);
      }
    }

    console.log(`\n  完成 ${gen} 个 (失败${fail}个), 累计${totalGen}个`);
    console.log(`  耗时 ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  }

  console.log(`\n=== 总计: ${totalGen}个新题目 ===`);
  console.log(`耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`目录: ${OUTPUT_DIR}`);
}

main();
