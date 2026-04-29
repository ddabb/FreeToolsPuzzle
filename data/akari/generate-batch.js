const fs = require("fs");
const path = require("path");
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

function solve(grid, maxS) {
  maxS = maxS || 2;
  const n = grid.length;
  const sols = [];
  
  function lit(board, r, c) {
    if (grid[r][c] !== ".") return false;
    for (let j = 0; j < n; j++) {
      if (j !== c && board[r][j] === "L") {
        let b = false;
        for (let k = Math.min(j, c) + 1; k < Math.max(j, c); k++) {
          if (grid[r][k] !== ".") { b = true; break; }
        }
        if (!b) return false;
      }
    }
    for (let i = 0; i < n; i++) {
      if (i !== r && board[i][c] === "L") {
        let b = false;
        for (let k = Math.min(i, r) + 1; k < Math.max(i, r); k++) {
          if (grid[k][c] !== ".") { b = true; break; }
        }
        if (!b) return false;
      }
    }
    return true;
  }
  
  function con(board) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const g = grid[r][c];
        if (g >= "0" && g <= "4") {
          let cnt = 0;
          DIRS.forEach(([dr, dc]) => {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && board[nr][nc] === "L") cnt++;
          });
          if (cnt !== parseInt(g)) return false;
        }
      }
    }
    return true;
  }
  
  function allLit(board) {
    const s = new Set();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === "L") {
          for (let j = c; j >= 0; j--) { if (grid[r][j] !== "." && j !== c) break; s.add(r + "," + j); }
          for (let j = c; j < n; j++) { if (grid[r][j] !== "." && j !== c) break; s.add(r + "," + j); }
          for (let i = r; i >= 0; i--) { if (grid[i][c] !== "." && i !== r) break; s.add(i + "," + c); }
          for (let i = r; i < n; i++) { if (grid[i][c] !== "." && i !== r) break; s.add(i + "," + c); }
        }
      }
    }
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (grid[r][c] === "." && board[r][c] !== "L" && !s.has(r + "," + c)) return false;
      }
    }
    return true;
  }
  
  function bt(board, cells, idx) {
    if (sols.length >= maxS) return;
    if (idx === cells.length) {
      if (con(board) && allLit(board)) sols.push(board.map(r => [...r]));
      return;
    }
    const [r, c] = cells[idx];
    bt(board, cells, idx + 1);
    if (lit(board, r, c)) {
      const nb = board.map(row => [...row]);
      nb[r][c] = "L";
      bt(nb, cells, idx + 1);
    }
  }
  
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (grid[r][c] === ".") cells.push([r, c]);
  bt(grid.map(r => [...r]), cells, 0);
  return sols;
}

function gen(size, att) {
  att = att || 30;
  for (let at = 0; at < att; at++) {
    const L = [];
    const g = Array(size).fill(null).map(() => Array(size).fill("."));
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    
    function canP(g, L, r, c) {
      for (const [lr, lc] of L) {
        if (lr === r) {
          let b = false;
          for (let k = Math.min(lc, c) + 1; k < Math.max(lc, c); k++) if (g[r][k] !== ".") { b = true; break; }
          if (!b) return false;
        }
        if (lc === c) {
          let b = false;
          for (let k = Math.min(lr, r) + 1; k < Math.max(lr, r); k++) if (g[k][c] !== ".") { b = true; break; }
          if (!b) return false;
        }
      }
      return true;
    }
    
    for (const [rr, cc] of cells) if (g[rr][cc] === "." && canP(g, L, rr, cc)) L.push([rr, cc]);
    
    for (let i = 0; i < L.length; i++) {
      for (let j = i + 1; j < L.length; j++) {
        const [r1, c1] = L[i], [r2, c2] = L[j];
        if (r1 === r2) {
          const mc = Math.floor((c1 + c2) / 2);
          if (g[r1][mc] === ".") g[r1][mc] = "#";
        }
        if (c1 === c2) {
          const mr = Math.floor((r1 + r2) / 2);
          if (g[mr][c1] === ".") g[mr][c1] = "#";
        }
      }
    }
    
    for (const [lr, lc] of L) {
      DIRS.forEach(([dr, dc]) => {
        const nr = lr + dr, nc = lc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && g[nr][nc] === "." && Math.random() < 0.3) {
          let cnt = 0;
          DIRS.forEach(([dr2, dc2]) => {
            const nr2 = nr + dr2, nc2 = nc + dc2;
            if (nr2 >= 0 && nr2 < size && nc2 >= 0 && nc2 < size && L.some(([lr, lc]) => lr === nr2 && lc === nc2)) cnt++;
          });
          g[nr][nc] = String(cnt);
        }
      });
    }
    
    const sols = solve(g, 2);
    if (sols.length >= 1) {
      const ans = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (sols[0][r][c] === "L") ans.push([r, c]);
      return { size, grid: g, answer: ans };
    }
  }
  return null;
}

const diffs = [
  { d: "easy", s: 6, t: 100 },
  { d: "medium", s: 8, t: 50 },
  { d: "hard", s: 10, t: 50 }
];

diffs.forEach(diff => {
  const dir = path.join(__dirname, diff.d);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ex = fs.readdirSync(dir).filter(f => f.endsWith(".json")).length;
  if (ex >= diff.t) { console.log(diff.d + ": " + ex + " already"); return; }
  let ok = 0;
  for (let i = 0; i < diff.t * 2 && ok < diff.t; i++) {
    const p = gen(diff.s, 15);
    if (p) {
      const num = ok + 1;
      const fn = diff.d + "-" + String(num).padStart(4, "0") + ".json";
      fs.writeFileSync(path.join(dir, fn), JSON.stringify(p));
      ok++;
      if (ok % 20 === 0) console.log(diff.d + ": " + ok + "/" + diff.t);
    }
  }
  console.log(diff.d + ": " + ok + " generated");
});