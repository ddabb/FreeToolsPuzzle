const fs = require('fs');

class SmartSolver {
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

    countAvailableNeighbors(cell) {
        let count = 0;
        for (const n of this.neighbors(cell)) {
            if (!this.holeSet.has(n) && !this.visited[n]) count++;
        }
        return count;
    }

    sortByWarnsdorff(neighbors) {
        const scored = neighbors.map(n => ({
            cell: n, score: this.countAvailableNeighbors(n)
        }));
        scored.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return Math.random() - 0.5;
        });
        return scored.map(s => s.cell);
    }

    dfs(cell, depth) {
        if (depth === this.validCount) return true;
        if (Date.now() > this.deadline) return false;

        const nbrs = this.neighbors(cell).filter(n =>
            !this.holeSet.has(n) && !this.visited[n]
        );
        if (!nbrs.length) return false;

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
            this.path = [start]; this.visited.fill(0); this.visited[start] = 1;
            const saved = this.deadline;
            this.deadline = Math.min(saved, Date.now() + timePerStart);
            if (this.dfs(start, 1)) return this.path.slice();
            this.deadline = saved;
        }
        return null;
    }
}

const tests = [
    { file: 'easy-0001.json', ms: 3000 },
    { file: 'medium-0001.json', ms: 60000 },
    { file: 'hard-0001.json', ms: 60000 },
    { file: 'hard-0002.json', ms: 60000 },
];

console.log('Warnsdorff 启发式测试\n');

for (const t of tests) {
    const puzzle = JSON.parse(fs.readFileSync(t.file, 'utf8'));
    const rows = puzzle.row || puzzle.size, cols = puzzle.col || puzzle.size;
    const cells = rows * cols - puzzle.holes.length;
    console.log(`${t.file} (${rows}x${cols}, ${cells}格):`);
    const solver = new SmartSolver(rows, cols, puzzle.holes);
    const t0 = Date.now();
    const ans = solver.solve(t.ms);
    const elapsed = Date.now() - t0;
    if (ans?.length === cells) {
        console.log(`  ✓ ${elapsed}ms`);
    } else {
        console.log(`  X ${(t.ms/1000).toFixed(0)}s 未找到`);
    }
}
