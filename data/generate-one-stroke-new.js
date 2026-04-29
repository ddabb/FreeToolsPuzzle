/**
 * 一笔画题目生成器（重写版）
 * 
 * 核心思路：先生成答案路径，再定义题目
 * - 随机生成一条哈密顿路径（这就是答案）
 * - 路径上的格子是"有效格子"
 * - 不在路径上的格子就是"洞"
 * - 这样100%保证题目有解
 * 
 * 难度配置：
 *   easy: 6x6 网格，洞数 2-8（约35-58格需走过）
 *   medium: 8x8 网格，洞数 4-15（约49-60格需走过）
 *   hard: 10x10 网格，洞数 6-25（约75-94格需走过）
 */

const fs = require('fs');
const path = require('path');

// 难度配置
const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 2, maxHoles: 8, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 15, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 6, maxHoles: 25, count: 1000 }
};

const OUTPUT_DIR = path.join(__dirname, 'one-stroke');

class PathGenerator {
    constructor(rows, cols, targetCells) {
        this.rows = rows;
        this.cols = cols;
        this.total = rows * cols;
        this.targetCells = targetCells;  // 需要走过的格子数
        this.visited = new Uint8Array(this.total);
        this.path = [];
    }

    // 四方向邻居
    neighbors(cell) {
        const r = Math.floor(cell / this.cols), c = cell % this.cols;
        const result = [];
        if (r > 0) result.push(cell - this.cols);
        if (r < this.rows - 1) result.push(cell + this.cols);
        if (c > 0) result.push(cell - 1);
        if (c < this.cols - 1) result.push(cell + 1);
        return result;
    }

    // Warnsdorff: 计算后继可用邻居数
    countAvailable(cell) {
        let count = 0;
        for (const n of this.neighbors(cell)) {
            if (!this.visited[n]) count++;
        }
        return count;
    }

    // 按Warnsdorff优先级排序
    sortByPriority(neighbors) {
        const scored = neighbors.map(n => ({
            cell: n,
            score: this.countAvailable(n)
        }));
        // 升序（后继少的优先）+ 随机打破平局
        scored.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return Math.random() - 0.5;
        });
        return scored.map(s => s.cell);
    }

    // 生成路径（Warnsdorff启发式DFS + 多次重启）
    generate(maxMs = 5000) {
        const deadline = Date.now() + maxMs;
        let attempts = 0;

        while (Date.now() < deadline) {
            attempts++;
            // 随机起点
            const start = Math.floor(Math.random() * this.total);

            this.visited.fill(0);
            this.path = [start];
            this.visited[start] = 1;

            if (this.dfs(start, 1, deadline)) {
                return this.path.slice();
            }
        }
        console.log(`    [${this.targetCells}格 尝试${attempts}次 未找到]`);
        return null;
    }

    dfs(cell, depth, deadline) {
        if (depth === this.targetCells) return true;
        if (Date.now() > deadline) return false;  // 超时

        const nbrs = this.neighbors(cell).filter(n => !this.visited[n]);
        if (!nbrs.length) return false;

        const ordered = this.sortByPriority(nbrs);
        for (const next of ordered) {
            this.visited[next] = 1;
            this.path[depth] = next;
            if (this.dfs(next, depth + 1, deadline)) return true;
            this.visited[next] = 0;
        }
        return false;
    }
}

// 生成单个题目
function generatePuzzle(rows, cols, minHoles, maxHoles, index) {
    const total = rows * cols;
    const maxMs = total <= 36 ? 2000 : total <= 64 ? 10000 : 30000;

    // 随机洞数（多试几个）
    const holeCounts = [];
    for (let h = minHoles; h <= maxHoles; h++) holeCounts.push(h);
    // 打乱顺序
    for (let i = holeCounts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [holeCounts[i], holeCounts[j]] = [holeCounts[j], holeCounts[i]];
    }

    for (const holeCount of holeCounts) {
        const targetCells = total - holeCount;
        const gen = new PathGenerator(rows, cols, targetCells);
        const answer = gen.generate(maxMs);

        if (answer && answer.length === targetCells) {
            const pathSet = new Set(answer);
            const holes = [];
            for (let i = 0; i < total; i++) {
                if (!pathSet.has(i)) holes.push(i);
            }
            return {
                size: rows, row: rows, col: cols,
                holes, difficulty: '', id: index, answer
            };
        }
    }

    // 所有洞数都试过了还没找到 → 降级（增加洞数范围上限再试）
    // 这种情况极罕见
    console.log(`    [${rows}x${cols} 全部洞数组合均失败，降级处理]`);
    const fallbackHoles = maxHoles + 2;
    return generatePuzzle(rows, cols, minHoles, Math.min(fallbackHoles, Math.floor(total * 0.35)), index);
}

// 批量生成
function generateAll() {
    console.log('一笔画题目生成器（重写版）');
    console.log('核心：先生成答案路径，再定义洞 → 100%有解\n');

    // 清空现有文件
    if (fs.existsSync(OUTPUT_DIR)) {
        const oldFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'));
        for (const f of oldFiles) {
            fs.unlinkSync(path.join(OUTPUT_DIR, f));
        }
    } else {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let totalSuccess = 0;
    const startTime = Date.now();

    for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
        console.log(`生成 ${difficulty} (${config.rows}x${config.cols}, 洞${config.minHoles}-${config.maxHoles})...`);

        let success = 0;
        let retries = 0;

        for (let i = 1; i <= config.count; i++) {
            const puzzle = generatePuzzle(
                config.rows, config.cols,
                config.minHoles, config.maxHoles,
                i
            );
            puzzle.difficulty = difficulty;

            const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
            fs.writeFileSync(
                path.join(OUTPUT_DIR, filename),
                JSON.stringify(puzzle, null, 2)
            );
            success++;

            if (success % 100 === 0) {
                process.stdout.write(`${success} `);
            }
        }

        totalSuccess += success;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n  完成 ${success} 个，累计耗时 ${elapsed}s\n`);
    }

    console.log(`=== 全部完成 ===`);
    console.log(`共生成 ${totalSuccess} 个题目`);
    console.log(`每题都有答案（路径长度 = 总格数 - 洞数）`);
    console.log(`输出目录: ${OUTPUT_DIR}`);
}

// 运行
generateAll();