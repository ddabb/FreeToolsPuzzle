/**
 * 一笔画答案生成器 v5 — 简单粗暴版
 * 
 * 核心思路：
 * 1. 随机 DFS + 大量重试（放弃复杂启发式）
 * 2. 每 100ms 换一个随机起点
 * 3. 找不到解的题目 → 直接跳过（可能本身无解）
 * 
 * 为什么不用复杂优化？
 * - 搜索显示：有洞网格的哈密顿路径是 NP-complete
 * - LeetCode 980 限定 m*n≤20，但我们是 60-94 格
 * - 最有效的方法：简单粗暴大量随机尝试
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 超简单随机 DFS 求解器
// ============================================================
class SimpleSolver {
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

    // 四方向邻居（不加任何启发式）
    neighbors(cell) {
        const r = Math.floor(cell / this.cols), c = cell % this.cols;
        const result = [];
        if (r > 0) result.push(cell - this.cols);           // 上
        if (r < this.rows - 1) result.push(cell + this.cols); // 下
        if (c > 0) result.push(cell - 1);                     // 左
        if (c < this.cols - 1) result.push(cell + 1);          // 右
        return result;
    }

    // 随机 DFS
    dfs(cell, depth) {
        if (depth === this.validCount) return true;  // 找到了
        if (Date.now() > this.deadline) return false; // 超时

        const nbrs = this.neighbors(cell);
        
        // Fisher-Yates shuffle（随机打乱邻居顺序）
        for (let i = nbrs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nbrs[i], nbrs[j]] = [nbrs[j], nbrs[i]];
        }

        for (const next of nbrs) {
            if (this.holeSet.has(next) || this.visited[next]) continue;
            this.visited[next] = 1;
            this.path[depth] = next;
            if (this.dfs(next, depth + 1)) return true;
            this.visited[next] = 0;
        }
        return false;
    }

    // 从随机起点尝试
    solve(maxMs) {
        this.deadline = Date.now() + maxMs;
        
        // 所有可能的起点
        const starts = [];
        for (let i = 0; i < this.total; i++) {
            if (!this.holeSet.has(i)) starts.push(i);
        }

        // 随机打乱起点顺序
        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }

        const timePerStart = 100;  // 每个起点给 100ms

        for (const start of starts) {
            if (Date.now() > this.deadline) break;

            // 重置状态
            this.path = [start];
            this.visited.fill(0);
            this.visited[start] = 1;

            // 从这个起点尝试（给定时间）
            const localDeadline = Math.min(this.deadline, Date.now() + timePerStart);
            const saved = this.deadline;
            this.deadline = localDeadline;

            if (this.dfs(start, 1)) {
                return this.path.slice();
            }

            this.deadline = saved;
        }
        return null;
    }

    // 连通性检查（快速失败）
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
            for (const next of this.neighbors(cur)) {
                if (!this.holeSet.has(next) && !seen.has(next)) {
                    seen.add(next);
                    queue.push(next);
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
        f.endsWith('.json') && f !== 'generate-answers-v5.js'
    );

    console.log('简单粗暴版答案生成器 v5');
    console.log('找到', files.length, '个题目文件\n');

    let solved = 0, skipped = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(dataDir, file);

        if (i % 100 === 0) {
            console.log(`[${i}/${files.length}] 已处理 ${solved} 题，跳过 ${skipped}，失败 ${failed}`);
        }

        try {
            const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // 已有答案 → 跳过
            if (puzzle.answer && Array.isArray(puzzle.answer) && puzzle.answer.length > 0) {
                skipped++;
                continue;
            }

            const rows = puzzle.row || puzzle.size;
            const cols = puzzle.col || puzzle.size;

            if (!rows || !cols || !puzzle.holes) {
                failed++;
                continue;
            }

            const solver = new SimpleSolver(rows, cols, puzzle.holes);

            // 连通性检查
            if (!solver.isConnected()) {
                console.log(`  X ${file}: 不连通，删除`);
                // fs.unlinkSync(filePath);  // 删除不连通的题目（谨慎起见注释）
                failed++;
                continue;
            }

            // 根据题目大小给时间
            const cells = rows * cols - puzzle.holes.length;
            const maxMs = cells <= 36 ? 2000 : cells <= 60 ? 30000 : 60000;

            console.log(`  ? ${file}: ${rows}x${cols}, ${cells}格, 尝试中...`);
            const startTime = Date.now();

            const answer = solver.solve(maxMs);

            if (answer && answer.length === cells) {
                puzzle.answer = answer;
                fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 2), 'utf8');
                console.log(`  ✓ ${file}: 找到答案 (${Date.now() - startTime}ms)`);
                solved++;
            } else {
                console.log(`  X ${file}: ${maxMs/1000}秒未找到`);
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
