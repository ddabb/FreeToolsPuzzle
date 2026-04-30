/**
 * Akari谜题生成器 - 简化版
 * 不强制唯一解，只保证：
 * 1. 题目可解
 * 2. 数字墙约束正确
 */

const fs = require('fs');
const path = require('path');

// 简单求解器
function solve(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  const emptyCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  
  function isValid(lights, r, c) {
    for (const l of lights) {
      if (l.r === r || l.c === c) {
        if (l.r === r) {
          for (let cc = Math.min(l.c,c)+1; cc < Math.max(l.c,c); cc++) {
            if (grid[r][cc] >= 1) return true;
          }
          return false;
        } else {
          for (let rr = Math.min(l.r,r)+1; rr < Math.max(l.r,r); rr++) {
            if (grid[rr][c] >= 1) return true;
          }
          return false;
        }
      }
    }
    return true;
  }
  
  function allLit(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== 0) continue;
        let lit = false;
        for (const l of lights) {
          if (l.r === r && l.c === c) { lit = true; break; }
          if (l.r === r) {
            let blocked = false;
            for (let cc = Math.min(l.c,c)+1; cc < Math.max(l.c,c); cc++) {
              if (grid[r][cc] >= 1) blocked = true;
            }
            if (!blocked) { lit = true; break; }
          }
          if (l.c === c) {
            let blocked = false;
            for (let rr = Math.min(l.r,r)+1; rr < Math.max(l.r,r); rr++) {
              if (grid[rr][c] >= 1) blocked = true;
            }
            if (!blocked) { lit = true; break; }
          }
        }
        if (!lit) return false;
      }
    }
    return true;
  }
  
  function checkNum(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] >= 2 && grid[r][c] <= 6) {
          const exp = grid[r][c] - 2;
          let act = 0;
          for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && lights.some(l => l.r === nr && l.c === nc)) act++;
          }
          if (act !== exp) return false;
        }
      }
    }
    return true;
  }
  
  function bt(i, lights) {
    if (i === emptyCells.length) {
      return allLit(lights) && checkNum(lights) ? [...lights] : null;
    }
    const cell = emptyCells[i];
    // 不放灯塔
    const res = bt(i + 1, lights);
    if (res) return res;
    // 放灯塔
    if (isValid(lights, cell.r, cell.c)) {
      lights.push(cell);
      const res2 = bt(i + 1, lights);
      lights.pop();
      if (res2) return res2;
    }
    return null;
  }
  
  return bt(0, []);
}

// 生成一题
function gen(size, diff) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 放黑格
  const wallRate = diff === 'easy' ? 0.1 : diff === 'medium' ? 0.15 : 0.2;
  const walls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < wallRate) walls.push({ r, c });
    }
  }
  for (const w of walls) grid[w.r][w.c] = 1;
  
  // 求解
  const sol = solve(grid);
  if (!sol) return null;
  
  // 设置数字墙
  for (const w of walls) {
    if (Math.random() < 0.6) {
      let cnt = 0;
      for (const [nr, nc] of [[w.r-1,w.c],[w.r+1,w.c],[w.r,w.c-1],[w.r,w.c+1]]) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && sol.some(l => l.r === nr && l.c === nc)) cnt++;
      }
      grid[w.r][w.c] = cnt + 2; // 关键修复
    }
  }
  
  return { grid, lights: sol };
}

// 主函数
function main() {
  console.log('Akari生成器（简化版）\n');
  
  const configs = [
    { d: 'easy', s: 7, n: 1000 },
    { d: 'medium', s: 10, n: 1000 },
    { d: 'hard', s: 12, n: 1000 }
  ];
  
  for (const cfg of configs) {
    console.log(`${cfg.d} (${cfg.s}x${cfg.s})...`);
    const dir = path.join(__dirname, cfg.d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    let n = 0;
    for (let att = 0; n < cfg.n && att < cfg.n * 10; att++) {
      const p = gen(cfg.s, cfg.d);
      if (p) {
        n++;
        fs.writeFileSync(path.join(dir, `${cfg.d}-${String(n).padStart(4,'0')}.json`), 
          JSON.stringify({ id: n, difficulty: cfg.d, size: cfg.s, grid: p.grid, answer: p.lights.map(l => [l.r, l.c]) }, null, 2));
        if (n % 200 === 0) console.log(`  ${n}/${cfg.n}`);
      }
    }
    console.log(`  完成: ${n}\n`);
  }
}

main();
