const fs = require('fs');
const path = require('path');
require('./generate-answers'); // load GridPathFinder

// Test: solve 5 hard puzzles
const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.startsWith('hard-') && f.endsWith('.json')).slice(0, 5);

console.log('Testing', files.length, 'hard puzzles...\n');
const holeSet = new Set();

function GridPathFinder(row, column, notExistPotList) {
    this.row = row; this.column = column; this.notExistPotList = notExistPotList || [];
    this.passedPot = new Array(row * column).fill(false);
    this.pathLen = row * column - this.notExistPotList.length;
    this.path = new Array(this.pathLen).fill(null);
    this.noFullPath = true; this._holeSet = null;
}
GridPathFinder.prototype._initHoleSet = function() { if (!this._holeSet) this._holeSet = new Set(this.notExistPotList); };
GridPathFinder.prototype._isHole = function(pot) { this._initHoleSet(); return this._holeSet.has(pot); };
GridPathFinder.prototype._neighbors = function(pot) {
    const r = Math.floor(pot / this.column), c = pot % this.column;
    const n = [];
    if (r > 0 && !this._isHole(pot - this.column)) n.push(pot - this.column);
    if (r < this.row - 1 && !this._isHole(pot + this.column)) n.push(pot + this.column);
    if (c > 0 && !this._isHole(pot - 1)) n.push(pot - 1);
    if (c < this.column - 1 && !this._isHole(pot + 1)) n.push(pot + 1);
    return n;
};
GridPathFinder.prototype._inBounds = function(pot) { return pot >= 0 && pot < this.row * this.column; };
const DIRS = [{dx:0,dy:-1,bound:1},{dx:1,dy:0,bound:8},{dx:0,dy:1,bound:2},{dx:-1,dy:0,bound:4}];
GridPathFinder.prototype._decideBounds = function(pot) {
    let b = 0;
    if (pot < this.column) b |= 1;
    if (pot >= (this.row - 1) * this.column) b |= 2;
    if (pot % this.column === 0) b |= 4;
    if (pot % this.column === this.column - 1) b |= 8;
    return b;
};
GridPathFinder.prototype.setPassedPotAndPath = function(p, a, b) {
    if (b === undefined) { b = true; if (p !== undefined) { a = p; p = 0; } else p = 0; }
    this.path[p] = a; this.passedPot[a] = b;
};
GridPathFinder.prototype.setPassedPot = function(a, b) { this.passedPot[a] = b; };
GridPathFinder.prototype.getPath = function() { return this.path; };
GridPathFinder.prototype.resetPath = function() { this.path.fill(null); this.passedPot.fill(false); this.noFullPath = true; };
GridPathFinder.prototype._runFrom = function(nowPos) {
    const a = this.path[nowPos];
    if (nowPos === this.pathLen - 1) { this.noFullPath = false; return true; }
    const un = this._neighbors(a).filter(n => !this.passedPot[n]);
    if (un.length === 1 && nowPos < this.pathLen - 2) return false;
    const bounds = this._decideBounds(a);
    for (const dir of DIRS) {
        if (!this.noFullPath) return true;
        if (bounds & dir.bound) continue;
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
GridPathFinder.prototype.findPath = function(maxMs) {
    maxMs = maxMs || 8000;
    const holeSet = new Set(this.notExistPotList);
    const total = this.row * this.column;
    const degree = (cell) => {
        const r = Math.floor(cell / this.column), c = cell % this.column;
        let d = 0;
        if (r > 0 && !holeSet.has(cell - this.column)) d++;
        if (r < this.row - 1 && !holeSet.has(cell + this.column)) d++;
        if (c > 0 && !holeSet.has(cell - 1)) d++;
        if (c < this.column - 1 && !holeSet.has(cell + 1)) d++;
        return d;
    };
    const validStarts = [];
    for (let i = 0; i < total; i++) if (!holeSet.has(i)) validStarts.push(i);
    validStarts.sort((a, b) => degree(a) - degree(b));
    const deadline = Date.now() + maxMs;
    for (const start of validStarts) {
        if (Date.now() > deadline) break;
        this.resetPath();
        this.setPassedPotAndPath(0, start, true);
        if (this._runFrom(0)) return this.getPath();
    }
    return null;
};

let solved = 0, failed = 0;
for (const file of files) {
    const puzzle = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const rows = puzzle.row || puzzle.size;
    const cols = puzzle.col || puzzle.size;
    const t0 = Date.now();
    const finder = new GridPathFinder(rows, cols, puzzle.holes);
    const path = finder.findPath(5000);
    const ms = Date.now() - t0;
    if (path) {
        const len = path.filter(x => x !== null).length;
        console.log('OK ' + file + ': ' + len + ' cells in ' + ms + 'ms');
        solved++;
    } else {
        console.log('FAIL ' + file + ' in ' + ms + 'ms');
        failed++;
    }
}
console.log('\nSolved: ' + solved + '/' + files.length);
