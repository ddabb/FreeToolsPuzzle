// 测试简单版求解器
const fs = require('fs');

class SimpleSolver {
    constructor(rows, cols, holes) {
        this.rows = rows; this.cols = cols; this.total = rows * cols;
        this.holeSet = new Set(holes);
        this.validCount = this.total - holes.length;
        this.path = []; this.visited = new Uint8Array(this.total);
        this.deadline = 0;
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

    dfs(cell, depth) {
        if (depth === this.validCount) return true;
        if (Date.now() > this.deadline) return false;

        const nbrs = this.neighbors(cell);
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

    solve(maxMs) {
        this.deadline = Date.now() + maxMs;
        const starts = [];
        for (let i = 0; i < this.total; i++) {
            if (!this.holeSet.has(i)) starts.push(i);
        }
        for (let i = starts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [starts[i], starts[j]] = [starts[j], starts[i]];
        }

        const timePerStart = 100;
        for (const start of starts) {
            if (Date.now() > this.deadline) break;
            this.path = [start];
            this.visited.fill(0);
            this.visited[start] = 1;

            const localDeadline = Math.min(this.deadline, Date.now() + timePerStart);
            const saved = this.deadline;
            this.deadline = localDeadline;

            if (this.dfs(start, 1)) return this.path.slice();
            this.deadline = saved;
        }
        return null;
    }
}

// 测试
const tests = [
    { file: 'medium-0001.json', ms: 60000 },
    { file: 'hard-0001.json', ms: 60000 },
    { file: 'hard-0002.json', ms: 60000 },
];

console.log('简单粗暴版求解器测试\n');

for (const t of tests) {
    const puzzle = JSON.parse(fs.readFileSync(t.file, 'utf8'));
    const rows = puzzle.row || puzzle.size, cols = puzzle.col || puzzle.size;
    const cells = rows * cols - puzzle.holes.length;

    console.log(`\n${t.file} (${rows}x${cols}, ${cells}格):`);

    const solver = new SimpleSolver(rows, cols, puzzle.holes);
    const t0 = Date.now();
    const ans = solver.solve(t.ms);
    const elapsed = Date.now() - t0;

    if (ans && ans.length === cells) {
        console.log(`  ✓ 找到答案！(${elapsed}ms)`);
    } else {
        console.log(`  X ${t.ms/1000}秒未找到`);
    }
}
