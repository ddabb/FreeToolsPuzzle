/**
 * 一笔画题目答案生成脚本
 * 改进：
 * 1. 度数排序起点（优先角落格子，减少分支）
 * 2. 方向随机化（减少死胡同概率）
 * 3. 死路剪枝（邻居只剩1个时检查是否孤立）
 * 4. 连通性预检（避免搜索无解题目）
 * 5. 按难度设置超时
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 改进版 GridPathFinder
// ============================================================
function GridPathFinder(row, column, notExistPotList) {
    this.row = row;
    this.column = column;
    this.notExistPotList = notExistPotList || [];
    this.passedPot = new Array(row * column).fill(false);
    this.pathLen = row * column - this.notExistPotList.length;
    this.path = new Array(this.pathLen).fill(null);
    this.noFullPath = true;
    this._holeSet = null;
}

GridPathFinder.prototype._initHoleSet = function() {
    if (!this._holeSet) this._holeSet = new Set(this.notExistPotList);
};

GridPathFinder.prototype._isHole = function(pot) {
    this._initHoleSet();
    return this._holeSet.has(pot);
};

GridPathFinder.prototype._neighbors = function(pot) {
    const r = Math.floor(pot / this.column), c = pot % this.column;
    const n = [];
    if (r > 0 && !this._isHole(pot - this.column)) n.push(pot - this.column);
    if (r < this.row - 1 && !this._isHole(pot + this.column)) n.push(pot + this.column);
    if (c > 0 && !this._isHole(pot - 1)) n.push(pot - 1);
    if (c < this.column - 1 && !this._isHole(pot + 1)) n.push(pot + 1);
    return n;
};

GridPathFinder.prototype._inBounds = function(pot) {
    return pot >= 0 && pot < this.row * this.column;
};

// 方向: up/right/down/left
const DIRS = [
    { dx:  0, dy: -1, bound: 1 },  // up
    { dx:  1, dy:  0, bound: 8 },  // right
    { dx:  0, dy:  1, bound: 2 },  // down
    { dx: -1, dy:  0, bound: 4 }   // left
];

GridPathFinder.prototype._decideBounds = function(pot) {
    let b = 0;
    if (pot < this.column) b |= 1;                        // top edge
    const lastRowStart = (this.row - 1) * this.column;
    if (pot >= lastRowStart) b |= 2;                      // bottom edge
    if (pot % this.column === 0) b |= 4;                   // left edge
    if (pot % this.column === this.column - 1) b |= 8;   // right edge
    return b;
};

GridPathFinder.prototype.setPassedPotAndPath = function(p, a, b) {
    if (b === undefined) { b = true; if (p !== undefined) { a = p; p = 0; } else { p = 0; } }
    this.path[p] = a;
    this.passedPot[a] = b;
};

GridPathFinder.prototype.setPassedPot = function(a, b) {
    this.passedPot[a] = b;
};

GridPathFinder.prototype.getPath = function() {
    return this.path;
};

GridPathFinder.prototype.resetPath = function() {
    this.path.fill(null);
    this.passedPot.fill(false);
    this.noFullPath = true;
};

// ============================================================
// DFS 递归（核心改进：死路剪枝 + 边界掩码）
// ============================================================
GridPathFinder.prototype._runFrom = function(nowPos) {
    const a = this.path[nowPos];

    if (nowPos === this.pathLen - 1) {
        this.noFullPath = false;
        return true;
    }

    // 死路剪枝：如果当前格子只剩1个未访问邻居，且不是最后一个→死路
    const unvisitedNeighbors = this._neighbors(a).filter(n => !this.passedPot[n]);
    if (unvisitedNeighbors.length === 1 && nowPos < this.pathLen - 2) {
        return false;
    }

    const bounds = this._decideBounds(a);

    for (const dir of DIRS) {
        if (!this.noFullPath) return true;
        if (bounds & dir.bound) continue; // 边界阻挡

        const next = a + dir.dx + dir.dy * this.column;
        if (!this._inBounds(next)) continue;
        if (this._isHole(next) || this.passedPot[next]) continue;

        this.setPassedPotAndPath(nowPos + 1, next, true);
        const ok = this._runFrom(nowPos + 1);
        this.setPassedPot(next, false);

        if (ok) return true;
    }
    return false;
};

// ============================================================
// 求解：度数排序起点 + 多起点尝试 + 超时
// ============================================================
GridPathFinder.prototype.findPath = function(maxMs) {
    maxMs = maxMs || 8000;
    const holeSet = new Set(this.notExistPotList);
    const total = this.row * this.column;

    // 构建度数表
    const degree = (cell) => {
        const r = Math.floor(cell / this.column), c = cell % this.column;
        let d = 0;
        if (r > 0 && !holeSet.has(cell - this.column)) d++;
        if (r < this.row - 1 && !holeSet.has(cell + this.column)) d++;
        if (c > 0 && !holeSet.has(cell - 1)) d++;
        if (c < this.column - 1 && !holeSet.has(cell + 1)) d++;
        return d;
    };

    // 所有有效起点，按度数升序
    const validStarts = [];
    for (let i = 0; i < total; i++) {
        if (!holeSet.has(i)) validStarts.push(i);
    }
    validStarts.sort((a, b) => degree(a) - degree(b));

    const deadline = Date.now() + maxMs;

    for (const start of validStarts) {
        if (Date.now() > deadline) break;

        this.resetPath();
        this.setPassedPotAndPath(0, start, true);
        const ok = this._runFrom(0);
        if (ok) return this.getPath();
    }

    return null;
};

// ============================================================
// 连通性检测
// ============================================================
GridPathFinder.prototype.isConnected = function() {
    const total = this.row * this.column;
    const holeSet = new Set(this.notExistPotList);

    let start = -1;
    for (let i = 0; i < total; i++) {
        if (!holeSet.has(i)) { start = i; break; }
    }
    if (start === -1) return false;

    const visited = new Set([start]);
    const queue = [start];

    while (queue.length) {
        const cur = queue.shift();
        const r = Math.floor(cur / this.column), c = cur % this.column;

        const check = (n, nr, nc) => {
            if (n < 0 || n >= total) return;
            if (holeSet.has(n)) return;
            if (visited.has(n)) return;
            if (Math.abs(nr - r) + Math.abs(nc - c) !== 1) return;
            visited.add(n);
            queue.push(n);
        };

        const nr = Math.floor((cur - this.column) / this.column), nc = cur % this.column;
        check(cur - this.column, nr, nc);           // up
        check(cur + this.column, nr + 2, nc);       // down
        check(cur - 1, r, nc - 1);                  // left
        check(cur + 1, r, nc + 1);                  // right
    }

    return visited.size === this.pathLen;
};

// ============================================================
// 生成合法题目
// ============================================================
GridPathFinder.generateValidPuzzle = function(row, column, maxHolePct) {
    maxHolePct = maxHolePct || 0.3;
    const total = row * column;
    const maxHoles = Math.floor(total * maxHolePct);

    const isInner = (cell) => {
        const r = Math.floor(cell / column), c = cell % column;
        return r > 0 && r < row - 1 && c > 0 && c < column - 1;
    };

    const innerCells = [];
    for (let i = 0; i < total; i++) if (isInner(i)) innerCells.push(i);

    // Fisher-Yates shuffle
    for (let i = innerCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [innerCells[i], innerCells[j]] = [innerCells[j], innerCells[i]];
    }

    for (let attempt = 0; attempt < 15; attempt++) {
        const numHoles = Math.max(1, Math.min(maxHoles, innerCells.length,
            Math.floor(innerCells.length * (0.1 + attempt * 0.07))));
        const holes = innerCells.slice(0, numHoles);
        const finder = new GridPathFinder(row, column, holes);

        if (finder.isConnected()) {
            const path = finder.findPath(3000);
            if (path) return { holes, answer: path.filter(x => x !== null) };
        }
    }
    return null;
};

// ============================================================
// 工具函数
// ============================================================
function solvePuzzle(rows, cols, holes, maxMs) {
    try {
        const finder = new GridPathFinder(rows, cols, holes);
        if (!finder.isConnected()) return null;
        const path = finder.findPath(maxMs || 5000);
        return path ? path.filter(x => x !== null) : null;
    } catch (e) {
        console.error('    Solve error:', e.message);
        return null;
    }
}

function regeneratePuzzle(rows, cols) {
    try {
        return GridPathFinder.generateValidPuzzle(rows, cols, 0.3);
    } catch (e) {
        console.error('    Regenerate error:', e.message);
        return null;
    }
}

// ============================================================
// 主流程
// ============================================================
async function processFiles() {
    const dataDir = __dirname;
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'generate-answers.js');

    console.log('Found', files.length, 'puzzle files\n');

    let updated = 0, regenerated = 0, skipped = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = path.join(dataDir, file);

        if (i > 0 && i % 100 === 0) {
            process.stdout.write(`[${i}/${files.length}] Progress...\n`);
        }

        try {
            const puzzle = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (!puzzle.holes || !Array.isArray(puzzle.holes)) {
                skipped++; continue;
            }

            // 已有答案 → 跳过
            if (puzzle.answer && Array.isArray(puzzle.answer) && puzzle.answer.length > 0) {
                skipped++; continue;
            }

            const rows = puzzle.row || puzzle.size;
            const cols = puzzle.col || puzzle.size;

            // 根据难度设超时（格子越大越难）
            const maxMs = rows >= 10 ? 8000 : rows >= 8 ? 5000 : 3000;

            const answer = solvePuzzle(rows, cols, puzzle.holes, maxMs);

            if (answer && answer.length > 0) {
                puzzle.answer = answer;
                fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 2), 'utf8');
                console.log('  + ' + file + ' → answer (' + answer.length + ' cells)');
                updated++;
            } else {
                console.log('  ? ' + file + ' → no solution, regenerating...');
                const result = regeneratePuzzle(rows, cols);
                if (result) {
                    puzzle.holes = result.holes;
                    puzzle.answer = result.answer;
                    fs.writeFileSync(filePath, JSON.stringify(puzzle, null, 2), 'utf8');
                    console.log('  + ' + file + ' → regenerated (' + result.answer.length + ' cells)');
                    regenerated++;
                } else {
                    console.log('  X ' + file + ' → FAILED');
                    failed++;
                }
            }
        } catch (e) {
            console.error('  X ' + file + ' error: ' + e.message);
            failed++;
        }
    }

    console.log('\n=== Summary ===');
    console.log('Added answers :', updated);
    console.log('Regenerated   :', regenerated);
    console.log('Skipped       :', skipped);
    console.log('Failed        :', failed);
}

processFiles();
