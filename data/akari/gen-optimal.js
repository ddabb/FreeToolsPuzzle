/**
 * Akari谜题生成器 - 最优解版
 * 用最少数量的灯塔照亮所有格子
 */

const fs = require('fs');
const path = require('path');

// 检查格子是否被照亮
function isLit(grid, lights, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 自己是灯塔
  if (lights.some(l => l.r === r && l.c === c)) return true;
  
  // 检查同行同列是否有灯塔照亮
  for (const l of lights) {
    if (l.r === r && l.c !== c) {
      // 同行
      let blocked = false;
      const minC = Math.min(l.c, c);
      const maxC = Math.max(l.c, c);
      for (let cc = minC + 1; cc < maxC; cc++) {
        if (grid[r][cc] >= 1) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
    if (l.c === c && l.r !== r) {
      // 同列
      let blocked = false;
      const minR = Math.min(l.r, r);
      const maxR = Math.max(l.r, r);
      for (let rr = minR + 1; rr < maxR; rr++) {
        if (grid[rr][c] >= 1) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
  }
  return false;
}

// 检查两个灯塔是否互相照亮
function canPlace(grid, lights, r, c) {
  for (const l of lights) {
    if (l.r === r && l.c !== c) {
      const minC = Math.min(l.c, c);
      const maxC = Math.max(l.c, c);
      let blocked = false;
      for (let cc = minC + 1; cc < maxC; cc++) {
        if (grid[r][cc] >= 1) { blocked = true; break; }
      }
      if (!blocked) return false;
    }
    if (l.c === c && l.r !== r) {
      const minR = Math.min(l.r, r);
      const maxR = Math.max(l.r, r);
      let blocked = false;
      for (let rr = minR + 1; rr < maxR; rr++) {
        if (grid[rr][c] >= 1) { blocked = true; break; }
      }
      if (!blocked) return false;
    }
  }
  return true;
}

// 贪心+优化：用最少的灯塔照亮所有格子
function solveOptimal(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const lights = [];
  
  // 收集所有未照亮的白格
  const getUnlit = () => {
    const unlit = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0 && !isLit(grid, lights, r, c)) {
          unlit.push({ r, c });
        }
      }
    }
    return unlit;
  };
  
  // 计算放置灯塔能照亮的新格子数
  const countNewLit = (r, c) => {
    let count = 1; // 自己
    // 检查四个方向
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (grid[nr][nc] >= 1) break;
        if (!isLit(grid, lights, nr, nc)) count++;
        nr += dr;
        nc += dc;
      }
    }
    return count;
  };
  
  // 贪心：每次选择能照亮最多新格子的位置
  while (true) {
    const unlit = getUnlit();
    if (unlit.length === 0) break;
    
    // 找最佳位置
    let best = null;
    let bestCount = 0;
    
    for (const pos of unlit) {
      if (canPlace(grid, lights, pos.r, pos.c)) {
        const cnt = countNewLit(pos.r, pos.c);
        if (cnt > bestCount) {
          bestCount = cnt;
          best = pos;
        }
      }
    }
    
    if (!best) {
      // 找不到合法位置，尝试任意白格
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] === 0 && canPlace(grid, lights, r, c)) {
            const cnt = countNewLit(r, c);
            if (cnt > bestCount) {
              bestCount = cnt;
              best = { r, c };
            }
          }
        }
      }
    }
    
    if (!best) return null; // 无解
    lights.push(best);
  }
  
  // 优化：尝试移除冗余灯塔
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = lights.length - 1; i >= 0; i--) {
      const testLights = lights.filter((_, idx) => idx !== i);
      const allLit = grid.every((row, r) => 
        row.every((cell, c) => cell !== 0 || isLit(grid, testLights, r, c))
      );
      if (allLit) {
        lights.splice(i, 1);
        improved = true;
        break;
      }
    }
  }
  
  return lights;
}

// 生成谜题
function gen(size, diff) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 放黑格
  const wallRate = diff === 'easy' ? 0.06 : diff === 'medium' ? 0.08 : 0.1;
  const walls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < wallRate) {
        grid[r][c] = 1;
        walls.push({ r, c });
      }
    }
  }
  
  const sol = solveOptimal(grid);
  if (!sol) return null;
  
  // 给部分墙加数字
  for (const w of walls) {
    if (Math.random() < 0.5) {
      let cnt = 0;
      for (const [nr, nc] of [[w.r-1,w.c],[w.r+1,w.c],[w.r,w.c-1],[w.r,w.c+1]]) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && sol.some(l => l.r === nr && l.c === nc)) cnt++;
      }
      grid[w.r][w.c] = cnt + 2;
    }
  }
  
  return { grid, lights: sol, maxLights: sol.length };
}

// 主函数
function main() {
  console.log('Akari生成器（最优解版）\n');
  
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
          JSON.stringify({ 
            id: n, 
            difficulty: cfg.d, 
            size: cfg.s, 
            grid: p.grid, 
            answer: p.lights.map(l => [l.r, l.c]),
            maxLights: p.maxLights
          }, null, 2));
        if (n % 200 === 0) console.log(`  ${n}/${cfg.n}`);
      }
    }
    console.log(`  完成: ${n}\n`);
  }
  
  console.log('全部完成！');
}

main();
