const fs = require('fs');

class OneStrokeSolver {
    constructor(rows, cols, holes) {
        this.rows = rows; this.cols = cols; this.total = rows * cols;
        this.holeSet = new Set(holes);
        this.validCount = this.total - holes.length;
        this.pathLen = this.validCount;
        this.path = new Array(this.pathLen).fill(null);
        this.visited = new Uint8Array(this.total);
        this.deadline = 0; this.found = false;
        this._degrees = new Array(this.total);
        for (let i = 0; i < this.total; i++) {
            this._degrees[i] = this.holeSet.has(i) ? 0 : this._neighbors(i).length;
        }
        this._sortedStarts = this._buildStartOrder();
    }

    _neighbors(cell) {
        const r = Math.floor(cell / this.cols), c = cell % this.cols;
        const n = [];
        if (r > 0 && !this.holeSet.has(cell - this.cols)) n.push(cell - this.cols);
        if (r < this.rows - 1 && !this.holeSet.has(cell + this.cols)) n.push(cell + this.cols);
        if (c > 0 && !this.holeSet.has(cell - 1)) n.push(cell - 1);
        if (c < this.cols - 1 && !this.holeSet.has(cell + 1)) n.push(cell + 1);
        return n;
    }

    _degree(cell) { return this._degrees[cell]; }

    _buildStartOrder() {
        const holeSet = this.holeSet, cols = this.cols, rows = this.rows, total = this.total;
        const corners = [], edges = [], inner = [];
        for (let i = 0; i < total; i++) {
            if (holeSet.has(i)) continue;
            const r = Math.floor(i / cols), c = i % cols;
            const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
            const isCorner = (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1);
            if (isCorner) corners.push(i);
            else if (isEdge) edges.push(i);
            else inner.push(i);
        }
        const byDeg = (arr) => arr.sort((a, b) => this._degree(a) - this._degree(b));
        return [
            ...byDeg(corners.filter(i => this._degree(i) === 2)),
            ...byDeg(corners.filter(i => this._degree(i) === 3)),
            ...byDeg(edges.filter(i => this._degree(i) === 2)),
            ...byDeg(edges.filter(i => this._degree(i) === 3)),
            ...byDeg(corners), ...byDeg(edges), ...byDeg(inner)
        ];
    }

    _reset() { this.path.fill(null); this.visited.fill(0); this.found = false; }

    _tryStart(start) {
        this._reset();
        this.path[0] = start; this.visited[start] = 1;
        return this._iddfs(1);
    }

    _iddfs(depth) {
        if (this.found) return true;
        if (Date.now() > this.deadline) return false;
        if (depth === this.pathLen) { this.found = true; return true; }

        const cur = this.path[depth - 1];
        const unvisited = this._neighbors(cur).filter(n => !this.visited[n]);

        if (unvisited.length === 0) return false;

        // 死路剪枝 + 连通性剪枝
        if (unvisited.length === 1 && depth < this.pathLen - 1) {
            if (!this._canReachAll(depth)) return false;
        }

        unvisited.sort((a, b) => this._degree(a) - this._degree(b));

        for (const next of unvisited) {
            this.path[depth] = next; this.visited[next] = 1;
            if (this._iddfs(depth + 1)) return true;
            this.visited[next] = 0; this.path[depth] = null;
        }
        return false;
    }

    _canReachAll(visitedCount) {
        let first = -1;
        for (let i = 0; i < this.total; i++) {
            if (!this.holeSet.has(i) && !this.visited[i]) { first = i; break; }
        }
        if (first === -1) return true;
        const seen = new Set([first]), queue = [first];
        while (queue.length) {
            const cur = queue.shift();
            for (const n of this._neighbors(cur)) {
                if (!this.visited[n] && !this.holeSet.has(n) && !seen.has(n)) {
                    seen.add(n); queue.push(n);
                }
            }
        }
        return seen.size === (this.validCount - visitedCount);
    }

    solve(maxMs) {
        maxMs = maxMs || 10000;
        this.deadline = Date.now() + maxMs;
        const starts = this._sortedStarts;
        const timePerStart = Math.min(3000, Math.floor(maxMs / Math.max(starts.length, 1)));
        for (const start of starts) {
            if (Date.now() > this.deadline) break;
            const saved = this.deadline;
            this.deadline = Date.now() + timePerStart;
            if (this._tryStart(start)) return this.path.slice();
            this.deadline = saved;
        }
        return null;
    }

    isConnected() {
        let start = -1;
        for (let i = 0; i < this.total; i++) { if (!this.holeSet.has(i)) { start = i; break; } }
        if (start === -1) return false;
        const seen = new Set([start]), queue = [start];
        while (queue.length) {
            const cur = queue.shift();
            for (const n of this._neighbors(cur)) {
                if (!seen.has(n)) { seen.add(n); queue.push(n); }
            }
        }
        return seen.size === this.validCount;
    }
}

// 测试
const tests = [
    { file: 'medium-0001.json', ms: 20000 },
    { file: 'hard-0001.json',   ms: 20000 },
    { file: 'hard-0002.json',   ms: 20000 },
];

console.log('Testing OneStrokeSolver v3\n');
for (const t of tests) {
    const puzzle = JSON.parse(fs.readFileSync(t.file, 'utf8'));
    const rows = puzzle.row || puzzle.size, cols = puzzle.col || puzzle.size;
    const valid = rows * cols - puzzle.holes.length;
    console.log('File: ' + t.file + ' (' + rows + 'x' + cols + ', ' + valid + ' cells)');
    const solver = new OneStrokeSolver(rows, cols, puzzle.holes);
    console.log('  Connected:', solver.isConnected());
    const t0 = Date.now();
    const ans = solver.solve(t.ms);
    const ms = Date.now() - t0;
    if (ans) {
        console.log('  SOLVED in ' + ms + 'ms (' + ans.filter(x=>x!==null).length + ' cells)');
    } else {
        console.log('  FAIL after ' + ms + 'ms');
    }
}
