/**
 * 一笔画答案生成器 — 最终版
 * 
 * 核心启发式：Warnsdorff 规则（骑士巡游问题的经典策略）
 * - 每一步优先选择"后继可用邻居最少"的格子
 * - 这大幅减少搜索分支，避免死路
 * 
 * 参考：LeetCode 980 + 骑士巡游经典解法
 */

const fs = require('fs');
const path = require('path');

class SmartSolver {
    constructor(rows, cols, holes) {
        this.rows = rows;
        this.cols = cols;
        this.total = rows * cols;
        this.holeSet = new Set(holes);
        this.validCount = this.total - holes.length;
        this.path = [];
        this.visited = new Uint8Array(this.total);
        this.deadline = 0;
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

    // 核心：计算一个格子的"后继可用邻居数"
    countAvailableNeighbors(cell) {
        let count = 0;
        for (const n of this.neighbors(cell)) {
            if (!this.holeSet.has(n) && !this.visited[n]) count++;
        }
        return count;
    }

    // Warnsdorff 优先级排序
    sortByWarnsdorff(neighbors) {
        const scored = neighbors.map(n => ({
            cell: n,
            score: this.countAvailableNeighbors(n)
        }));
        // 按后继可用数升序（少的优先）+ 随机打破平局
        scored.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return Math.random() - 0.5;  // 同分随机
        });
        return scored.map(s => s.cell);
    }

    // 带启发式的DFS
    dfs(cell, depth) {
        if (depth === this.validCount) return true;  // 找到了！
        if (Date.now() > this.deadline) return false;

        const nbrs = this.neighbors(cell).filter(n =>
            !this.holeSet.has(n) && !this.visited[n]
        );

        if (!nbrs.length) return false;  // 无路可走，但未完成

        // 序：按 Warnsdorff 优先级
        const ordered = this.sortByWarnsdorff(nbrs);

        for (const next of ordered) {
            this.visited[next] = 1;
            this.path[depth] = next;
            if (this.dfs(next, depth + 1)) return true;
            this.visited[next] = 0;
        }
        return false;
    }

    solve(maxMs) {
        this.deadline = Date.now() + maxMs;

        // 所有可能的起点（随机顺序）
        const starts = [];
        for (let i = 0; i < this.total; i++) {
            if (!this.holeSet.has(i)) starts.push(i);
        }
        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }

        const timePerStart = Math.max(50, Math.floor(maxMs / starts.length));

        for (const start of starts) {
            if (Date.now() > this.deadline) break;

            this.path = [start];
            this.visited.fill(0);
            this.visited[start] = 1;

            const saved = this.deadline;
            this.deadline = Math.min(saved, Date.now() + timePerStart);

            if (this.dfs(start, 1)) {
                return this.path.slice();
            }
            this.deadline = saved;
        }
        return null;
    }

    isConnected() {
        let start = -1;
        for (let i = 0; i < this.total; i++) {
            if (!this.holeSet.has(i)) { start = i; break; }
        }
        if (start === -1) return false;

        const seen = new Set([start]);
        const queue = [start];
        while (queue.length) {
            const cur = queue.shift();
            for (const n of this.neighbors(cur)) {
                if (!this.holeSet.has(n) && !seen.has(n)) {
                    seen.add(n);
                    queue.push(n);
                }
            }
        }
        return seen.size === this.validCount;
    }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
    const dataDir = __dirname;
    const files = fs.readdirSync(dataDir).filter(f =>
        f.endsWith('.json') && !f.includes('generate-answers')
    );

    console.log('Warnsdorff启发式答案生成器');
    console.log('找到', files.length, '个题目文件\n');

    let solved = 0, skipped = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(dataDir, file);

        if (i % 100 === 0) {
            console.log(`[${i}/${files.length}] ✓${solved} 跳${skipped} X${failed}`);
        }

        try {
            const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // 已有答案 → 跳过
            if (puzzle.answer?.length > 0) {
                skipped++;
                continue;
            }

            const rows = puzzle.row || puzzle.size;
            const cols = puzzle.col || puzzle.size;
            if (!rows || !cols || !puzzle.holes) { failed++; continue; }

            const solver = new SmartSolver(rows, cols, puzzle.holes);
            if (!solver.isConnected()) {
                console.log(`  X ${file}: 不连通`);
                failed++;
                continue;
            }

            const cells = rows * cols - puzzle.holes.length;
            const maxMs = cells <= 36 ? 3000 : cells <= 60 ? 30000 : 60000;

            const start = Date.now();
            const answer = solver.solve(maxMs);
            const elapsed = Date.now() - start;

            if (answer?.length === cells) {
                puzzle.answer = answer;
                fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 2), 'utf8');
                console.log(`  ✓ ${file}: ${elapsed}ms`);
                solved++;
            } else {
                console.log(`  X ${file}: ${(maxMs/1000).toFixed(0)}s 未找到`);
                failed++;
            }
        } catch (e) {
            console.error(`  X ${file}: ${e.message}`);
            failed++;
        }
    }

    console.log('\n=== 完成 ===');
    console.log(`已解出: ${solved}`);
    console.log(`已跳过: ${skipped}`);
    console.log(`失败: ${failed}`);
}

main();
