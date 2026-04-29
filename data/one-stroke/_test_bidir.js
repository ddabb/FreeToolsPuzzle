/**
 * 测试双向DFS对 medium/hard 难度的效果
 */
const fs = require('fs');

// 双向搜索
function solveBidirectional(rows, cols, holes, maxMs) {
    maxMs = maxMs || 5000;
    const holeSet = new Set(holes);
    const total = rows * cols;
    const validCells = total - holes.length;

    // 获取邻居
    const neighbors = (cell) => {
        const r = Math.floor(cell / cols), c = cell % cols;
        const n = [];
        if (r > 0 && !holeSet.has(cell - cols)) n.push(cell - cols);
        if (r < rows - 1 && !holeSet.has(cell + cols)) n.push(cell + cols);
        if (c > 0 && !holeSet.has(cell - 1)) n.push(cell - 1);
        if (c < cols - 1 && !holeSet.has(cell + 1)) n.push(cell + 1);
        return n;
    };

    const inBounds = (c) => c >= 0 && c < total;

    // 度数计算
    const degree = (cell) => neighbors(cell).length;

    // 所有有效起点，按度数排序
    const allCells = [];
    for (let i = 0; i < total; i++) {
        if (!holeSet.has(i)) allCells.push({ cell: i, deg: degree(i) });
    }
    allCells.sort((a, b) => a.deg - b.deg);
    const starts = allCells.map(x => x.cell);

    const deadline = Date.now() + maxMs;

    // 从度数最小的开始尝试
    for (const startCell of starts) {
        if (Date.now() > deadline) break;

        // 双向BFS（不是真正的双向DFS，而是分层扩展）
        // 用字典存储：从起点走的路径 和 从终点走的路径
        // 实际上这里用IDA* + 剪枝更好

        // 单向DFS，但加了更好的剪枝
        const path = [];
        const visited = new Set();
        visited.add(startCell);
        path.push(startCell);

        const deadEnd = (cell) => {
            const nbrs = neighbors(cell).filter(n => !visited.has(n));
            return nbrs.length;
        };

        // 检查是否还有未访问格子在"孤岛"中
        const hasOrphaned = () => {
            const unvisited = allCells.filter(x => !visited.has(x.cell));
            if (unvisited.length === 0) return false;
            // BFS从任意未访问格子，看能否到达其他未访问格
            const start = unvisited[0].cell;
            const seen = new Set([start]);
            const queue = [start];
            while (queue.length) {
                const cur = queue.shift();
                for (const n of neighbors(cur)) {
                    if (!visited.has(n) && !seen.has(n)) {
                        seen.add(n);
                        queue.push(n);
                    }
                }
            }
            return seen.size < unvisited.length;
        };

        const dfs = (depth) => {
            if (Date.now() > deadline) return false;

            if (path.length === validCells) return true;

            // 剪枝：剩余格子是否连通？
            // 用快速检查：当前格子邻居中未访问的数量
            const cur = path[path.length - 1];
            const nbrs = neighbors(cur).filter(n => !visited.has(n));

            // 如果当前格子死路且还有格未访问 → 回溯
            if (nbrs.length === 0 && path.length < validCells) return false;

            // 启发式排序：优先走分支少的邻居
            nbrs.sort((a, b) => degree(a) - degree(b));

            for (const next of nbrs) {
                // 额外剪枝：如果是唯一出口但不是最后一步，且会导致孤立 → 跳过
                if (nbrs.length === 1 && path.length < validCells - 1) {
                    // 检查这个邻居是否会孤立其他格子
                    const nextNbrs = neighbors(next).filter(n => !visited.has(n) && n !== cur);
                    if (nextNbrs.length === 0) continue; // 死路格子
                }

                path.push(next);
                visited.add(next);
                if (dfs(depth + 1)) return true;
                path.pop();
                visited.delete(next);
            }
            return false;
        };

        if (dfs(0)) return path.slice();
    }

    return null;
}

// 旧算法对比（度数排序 + 死路剪枝）
function solveOld(rows, cols, holes, maxMs) {
    maxMs = maxMs || 5000;
    const holeSet = new Set(holes);
    const total = rows * cols;
    const validCells = total - holes.length;

    const neighbors = (cell) => {
        const r = Math.floor(cell / cols), c = cell % cols;
        const n = [];
        if (r > 0 && !holeSet.has(cell - cols)) n.push(cell - cols);
        if (r < rows - 1 && !holeSet.has(cell + cols)) n.push(cell + cols);
        if (c > 0 && !holeSet.has(cell - 1)) n.push(cell - 1);
        if (c < cols - 1 && !holeSet.has(cell + 1)) n.push(cell + 1);
        return n;
    };

    const degree = (cell) => neighbors(cell).length;

    const allCells = [];
    for (let i = 0; i < total; i++) {
        if (!holeSet.has(i)) allCells.push({ cell: i, deg: degree(i) });
    }
    allCells.sort((a, b) => a.deg - b.deg);
    const starts = allCells.map(x => x.cell);

    const deadline = Date.now() + maxMs;

    for (const startCell of starts) {
        if (Date.now() > deadline) break;

        const path = [];
        const visited = new Set();
        visited.add(startCell);
        path.push(startCell);

        const dfs = (depth) => {
            if (Date.now() > deadline) return false;
            if (path.length === validCells) return true;

            const cur = path[path.length - 1];
            const nbrs = neighbors(cur).filter(n => !visited.has(n));

            // 死路剪枝
            if (nbrs.length === 1 && path.length < validCells - 1) return false;

            nbrs.sort((a, b) => degree(a) - degree(b));

            for (const next of nbrs) {
                path.push(next);
                visited.add(next);
                if (dfs(depth + 1)) return true;
                path.pop();
                visited.delete(next);
            }
            return false;
        };

        if (dfs(0)) return path.slice();
    }
    return null;
}

// 测试
const tests = [
    { name: 'medium-0001', file: 'medium-0001.json', maxMs: 10000 },
    { name: 'hard-0001',   file: 'hard-0001.json',   maxMs: 15000 },
    { name: 'hard-0002',   file: 'hard-0002.json',   maxMs: 15000 },
    { name: 'hard-0003',   file: 'hard-0003.json',   maxMs: 15000 },
];

console.log('Testing bidirectional vs old algorithm\n');
console.log('| Puzzle       | Old (ms)  | BiDir (ms) | Result');
console.log('|--------------|-----------|------------|--------');

for (const test of tests) {
    const puzzle = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/one-stroke/' + test.file, 'utf8'));
    const rows = puzzle.row || puzzle.size;
    const cols = puzzle.col || puzzle.size;
    const valid = rows * cols - puzzle.holes.length;

    // 测试旧算法
    process.stdout.write(`| ${test.name.padEnd(12)} | `);
    const t0 = Date.now();
    const oldResult = solveOld(rows, cols, puzzle.holes, test.maxMs);
    const oldMs = Date.now() - t0;

    if (oldResult) {
        process.stdout.write(`${String(oldMs).padStart(7)} ms | `);
    } else {
        process.stdout.write(`${'TIMEOUT'.padStart(7)}    | `);
    }

    // 测试双向
    const t1 = Date.now();
    const biResult = solveBidirectional(rows, cols, puzzle.holes, test.maxMs);
    const biMs = Date.now() - t1;

    if (biResult) {
        console.log(`${String(biMs).padStart(8)} ms | OK (${biResult.length}/${valid})`);
    } else {
        console.log(`${'TIMEOUT'.padStart(8)}    | FAIL`);
    }
}
