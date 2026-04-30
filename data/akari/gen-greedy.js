/**
 * Akari谜题生成器 - 贪心版
 * 用贪心策略快速生成题目
 */

const fs = require('fs');
const path = require('path');

// 贪心求解器
function greedySolve(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const lights = [];
  
  // 先处理数字墙约束
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] >= 2 && grid[r][c] <= 6) {
        const need = grid[r][c] - 2;
        // 随机选择 need 个邻居放灯塔
        const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc]) => 
          nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0
        );
        // 打乱顺序
        for (let i = neighbors.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }
        for (let i = 0; i < Math.min(need, neighbors.length); i++) {
          const [nr, nc] = neighbors[i];
          if (!lights.some(l => l.r === nr && l.c === nc)) {
            lights.push({ r: nr, c: nc });
          }
        }
      }
    }
  }
  
  // 照亮所有格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 0) continue;
      
      // 检查是否已被照亮
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
      
      if (!lit) {
        // 需要放一个灯塔
        // 找一个不冲突的位置
        const candidates = [];
        for (let rr = 0; rr < rows; rr++) {
          if (grid[rr][c] !== 0) continue;
          let conflict = false;
          for (const l of lights) {
            if (l.r === rr || l.c === c) {
              if (l.r === rr) {
                for (let cc = Math.min(l.c,c)+1; cc < Math.max(l.c,c); cc++) {
                  if (grid[rr][cc] >= 1) { conflict = false; break; }
                }
              } else {
                for (let rrr = Math.min(l.r,rr)+1; rrr < Math.max(l.r,rr); rrr++) {
                  if (grid[rrr][c] >= 1) { conflict = false; break; }
                }
              }
              if (!conflict) break;
            }
          }
          if (!conflict) candidates.push({ r: rr, c });
        }
        for (let cc = 0; cc < cols; cc++) {
          if (grid[r][cc] !== 0) continue;
          let conflict = false;
          for (const l of lights) {
            if (l.r === r || l.c === cc) {
              if (l.r === r) {
                for (let ccc = Math.min(l.c,cc)+1; ccc < Math.max(l.c,cc); ccc++) {
                  if (grid[r][ccc] >= 1) { conflict = false; break; }
                }
              } else {
                for (let rrr = Math.min(l.r,r)+1; rrr < Math.max(l.r,r); rrr++) {
                  if (grid[rrr][cc] >= 1) { conflict = false; break; }
                }
              }
              if (!conflict) break;
            }
          }
          if (!conflict) candidates.push({ r, c: cc });
        }
        
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          lights.push(pick);
        }
      }
    }
  }
  
  // 验证
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
      if (!lit) return null;
    }
  }
  
  return lights;
}

// 生成
function gen(size, diff, startId) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 放黑格
  const wallRate = diff === 'easy' ? 0.06 : diff === 'medium' ? 0.08 : 0.1;
  const walls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < wallRate) walls.push({ r, c });
    }
  }
  for (const w of walls) grid[w.r][w.c] = 1;
  
  const sol = greedySolve(grid);
  if (!sol) return null;
  
  // 设置数字墙
  for (const w of walls) {
    if (Math.random() < 0.5) {
      let cnt = 0;
      for (const [nr, nc] of [[w.r-1,w.c],[w.r+1,w.c],[w.r,w.c-1],[w.r,w.c+1]]) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && sol.some(l => l.r === nr && l.c === nc)) cnt++;
      }
      grid[w.r][w.c] = cnt + 2;
    }
  }
  
  return { grid, lights: sol };
}

// 主函数
function main() {
  console.log('Akari生成器（贪心版）\n');
  
  const configs = [
    { d: 'hard', s: 12, n: 33, start: 968 }
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
        const id = (cfg.start || 0) + n;
        fs.writeFileSync(path.join(dir, `${cfg.d}-${String(id).padStart(4,'0')}.json`), 
          JSON.stringify({ id, difficulty: cfg.d, size: cfg.s, grid: p.grid, answer: p.lights.map(l => [l.r, l.c]) }, null, 2));
        if (n % 100 === 0) console.log(`  ${n}/${cfg.n}`);
      }
    }
    console.log(`  完成: ${n}\n`);
  }
  
  console.log('全部完成！');
}

main();
