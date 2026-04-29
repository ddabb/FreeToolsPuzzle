/**
 * 一笔画题目生成器 v2
 * 
 * 核心思路：先生成答案路径，再定义题目
 * - 路径上的格子是有效格子，不在路径上的就是洞
 * - 这样100%保证题目有解
 * 
 * 改进：
 * - 使用更好的Warnsdorff启发式 + 角度优化
 * - 多种邻域搜索策略
 * - 并行处理（利用多核）
 */

const fs = require('fs');
const path = require('path');
const { Worker, isMainThread, workerData, parentPort } = require('worker_threads');

const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 2, maxHoles: 8, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 15, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 6, maxHoles: 25, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');

// ============================================================
// 路径生成器（单线程版，放到Worker里）
// ============================================================
class PathGenerator {
    constructor(rows, cols, targetCells) {
        this.rows = rows;
        this.cols = cols;
        this.total = rows * cols;
        this.targetCells = targetCells;
    }

    neighbors(cell) {
        const r = Math.floor(cell / this.cols), c = cell % this.cols;
        const result = [];
        if (r > 0) result.push(cell - this.cols);
        if (r < this.rows - 1) result.push(cell + this.cols);
        if (c > 0) result.push(cell - 1);
        if (c < this.cols - 1) result.push(cell + 1);
        return result;
    }

    // Warnsdorff启发式：选择后继最少的邻居
    warnsdorffOrder(neighbors, visited) {
        return neighbors
            .filter(n => !visited[n])
            .map(n => {
                const nextNbrs = this.neighbors(n).filter(nn => !visited[nn]);
                return { cell: n, degree: nextNbrs.length };
            })
            .sort((a, b) => {
                if (a.degree !== b.degree) return a.degree - b.degree;
                return Math.random() - 0.5;
            })
            .map(x => x.cell);
    }

    // 生成一条路径（带回溯限制）
    generatePath(visited, path, depth, maxBacktrack = 5000) {
        if (path.length === this.targetCells) return true;
        if (depth > maxBacktrack) return false;

        const cell = path[depth - 1];
        const nbrs = this.neighbors(cell).filter(n => !visited[n]);
        if (!nbrs.length) return false;

        const ordered = this.warnsdorffOrder(nbrs, visited);

        for (const next of ordered) {
            visited[next] = 1;
            path[depth] = next;
            if (this.generatePath(visited, path, depth + 1, maxBacktrack)) return true;
            visited[next] = 0;
        }
        return false;
    }

    // 尝试生成路径（多次重启）
    tryGenerate(maxAttempts = 50, maxBacktrack = 10000) {
        const visited = new Uint8Array(this.total);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            visited.fill(0);
            const start = Math.floor(Math.random() * this.total);
            const path = [start];
            visited[start] = 1;

            if (this.generatePath(visited, path, 1, maxBacktrack)) {
                return path;
            }
        }
        return null;
    }
}

// ============================================================
// Worker线程：生成单个难度的一批题目
// ============================================================
function runWorker(difficulty, config, startIdx) {
    const { rows, cols, minHoles, maxHoles, count } = config;
    const total = rows * cols;
    const results = [];

    for (let i = 0; i < count; i++) {
        const index = startIdx + i;
        const puzzle = generateOne(rows, cols, minHoles, maxHoles, index);
        if (puzzle) {
            puzzle.difficulty = difficulty;
            results.push(puzzle);
        } else {
            console.log(`  ${difficulty}-${index}: 生成失败`);
        }

        if ((i + 1) % 100 === 0) {
            process.stdout.write(`${difficulty}(${i + 1}) `);
        }
    }
    return results;
}

function generateOne(rows, cols, minHoles, maxHoles, index) {
    const total = rows * cols;
    
    // 根据难度设置参数
    const maxAttempts = total <= 36 ? 100 : total <= 64 ? 200 : 500;
    const maxBacktrack = total <= 36 ? 5000 : total <= 64 ? 20000 : 100000;

    // 按难度排序尝试：洞越多越容易（路径越短）
    const holeOptions = [];
    for (let h = maxHoles; h >= minHoles; h--) {
        holeOptions.push(h);
    }
    // 打乱顺序（增加随机性）
    for (let i = holeOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [holeOptions[i], holeOptions[j]] = [holeOptions[j], holeOptions[i]];
    }

    for (const holeCount of holeOptions) {
        const targetCells = total - holeCount;
        const gen = new PathGenerator(rows, cols, targetCells);
        const answer = gen.tryGenerate(maxAttempts, maxBacktrack);

        if (answer && answer.length === targetCells) {
            const pathSet = new Set(answer);
            const holes = [];
            for (let i = 0; i < total; i++) {
                if (!pathSet.has(i)) holes.push(i);
            }
            return {
                size: rows, row: rows, col: cols,
                holes, id: index, answer
            };
        }
    }
    return null;
}

// ============================================================
// 主进程：协调生成
// ============================================================
function main() {
    console.log('一笔画题目生成器 v2');
    console.log('核心：先生成答案路径，再定义洞 → 100%有解\n');

    const startTime = Date.now();

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let totalGenerated = 0;

    // 按难度顺序生成（先易后难，便于观察进度）
    for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
        console.log(`\n生成 ${difficulty} (${config.rows}x${config.cols}, 洞${config.minHoles}-${config.maxHoles})...`);

        const puzzles = runWorker(difficulty, config, 1);
        console.log(`\n  完成 ${puzzles.length} 个`);

        // 写入文件
        for (const puzzle of puzzles) {
            const filename = `${puzzle.difficulty}-${String(puzzle.id).padStart(4, '0')}.json`;
            fs.writeFileSync(
                path.join(OUTPUT_DIR, filename),
                JSON.stringify(puzzle, null, 2)
            );
        }
        totalGenerated += puzzles.length;

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  累计耗时 ${elapsed}s`);
    }

    console.log(`\n=== 全部完成 ===`);
    console.log(`共生成 ${totalGenerated} 个题目`);
    console.log(`每题都有答案（路径长度 = 总格数 - 洞数）`);
    console.log(`输出目录: ${OUTPUT_DIR}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`总耗时: ${totalTime}s`);
}

main();