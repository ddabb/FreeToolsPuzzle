console.log('测试最优解算法');

const size = 7;
const grid = Array(size).fill(null).map(() => Array(size).fill(0));
grid[1][1] = 1;
grid[3][3] = 1;
grid[5][5] = 1;

console.log('网格: 7x7, 3个墙');

function isLit(grid, lights, r, c) {
  if (lights.some(l => l.r === r && l.c === c)) return true;
  for (const l of lights) {
    if (l.r === r && l.c !== c) {
      const minC = Math.min(l.c, c);
      const maxC = Math.max(l.c, c);
      let blocked = false;
      for (let cc = minC + 1; cc < maxC; cc++) {
        if (grid[r][cc] >= 1) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
    if (l.c === c && l.r !== r) {
      const minR = Math.min(l.r, r);
      const maxR = Math.max(l.r, r);
      let blocked = false;
      for (let rr = minR + 1; rr < maxR; rr++) {
        if (grid[rr][c] >= 1) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
  }
  return false;
}

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

function countNewLit(grid, lights, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  let count = 1;
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
}

function solveOptimal(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const lights = [];
  
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
  
  while (true) {
    const unlit = getUnlit();
    if (unlit.length === 0) break;
    
    let best = null;
    let bestCount = 0;
    
    for (const pos of unlit) {
      if (canPlace(grid, lights, pos.r, pos.c)) {
        const cnt = countNewLit(grid, lights, pos.r, pos.c);
        if (cnt > bestCount) {
          bestCount = cnt;
          best = pos;
        }
      }
    }
    
    if (!best) return null;
    lights.push(best);
  }
  
  // 移除冗余
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

const start = Date.now();
const sol = solveOptimal(grid);
const elapsed = Date.now() - start;
console.log('灯塔数:', sol ? sol.length : '无解');
console.log('耗时:', elapsed, 'ms');
console.log('灯塔位置:', sol);
