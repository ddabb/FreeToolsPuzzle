const fs = require('fs');
const path = require('path');

// 复用 gen-optimal.js 的逻辑
function isLit(grid, lights, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (lights.some(l => l.r === r && l.c === c)) return true;
  for (const l of lights) {
    if (l.r === r && l.c !== c) {
      let blocked = false;
      const minC = Math.min(l.c, c);
      const maxC = Math.max(l.c, c);
      for (let cc = minC + 1; cc < maxC; cc++) {
        if (grid[r][cc] >= 1) { blocked = true; break; }
      }
      if (!blocked) return true;
    }
    if (l.c === c && l.r !== r) {
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

function generatePuzzle(size, wallProb = 0.15, numberedWallProb = 0.5) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  const walls = [];
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < wallProb) {
        grid[r][c] = 1;
        walls.push({ r, c });
      }
    }
  }
  
  // 添加数字墙
  for (const wall of walls) {
    if (Math.random() < numberedWallProb) {
      let count = 0;
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dr, dc] of dirs) {
        const nr = wall.r + dr, nc = wall.c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 0) {
          count++;
        }
      }
      grid[wall.r][wall.c] = Math.min(count, 4);
    }
  }
  
  return { grid, walls };
}

function findOptimalSolution(grid) {
  const size = grid.length;
  const lights = [];
  let unlit = [];
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) unlit.push({ r, c });
    }
  }
  
  // 贪心
  while (unlit.length > 0) {
    let bestPos = null;
    let bestScore = -1;
    
    for (const pos of unlit) {
      if (!canPlace(grid, lights, pos.r, pos.c)) continue;
      
      let score = 0;
      for (const up of unlit) {
        if (isLit(grid, [...lights, { r: pos.r, c: pos.c }], up.r, up.c)) {
          score++;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
    
    if (!bestPos) break;
    
    lights.push({ r: bestPos.r, c: bestPos.c });
    unlit = unlit.filter(p => !isLit(grid, lights, p.r, p.c));
  }
  
  // 移除冗余
  for (let i = lights.length - 1; i >= 0; i--) {
    const testLights = lights.filter((_, idx) => idx !== i);
    let allLit = true;
    for (let r = 0; r < size && allLit; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 0 && !isLit(grid, testLights, r, c)) {
          allLit = false;
          break;
        }
      }
    }
    if (allLit) lights.splice(i, 1);
  }
  
  // 验证
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0 && !isLit(grid, lights, r, c)) {
        return null;
      }
    }
  }
  
  return lights;
}

function generateValidPuzzle(size, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    const { grid } = generatePuzzle(size);
    const lights = findOptimalSolution(grid);
    if (lights) {
      return { grid, lights, maxLights: lights.length };
    }
  }
  return null;
}

// 只补充缺失的4个文件
const missing = [
  { id: 5, difficulty: 'easy', size: 7 },
  { id: 6, difficulty: 'easy', size: 7 },
  { id: 7, difficulty: 'easy', size: 7 },
  { id: 8, difficulty: 'easy', size: 7 }
];

const baseDir = 'F:/SelfJob/FreeToolsPuzzle/data/akari';

for (const item of missing) {
  console.log(`生成 ${item.difficulty}-${item.id.toString().padStart(4, '0')}...`);
  const p = generateValidPuzzle(item.size);
  if (p) {
    const fname = path.join(baseDir, item.difficulty, `${item.difficulty}-${item.id.toString().padStart(4, '0')}.json`);
    fs.writeFileSync(fname, JSON.stringify({
      id: item.id,
      difficulty: item.difficulty,
      size: item.size,
      grid: p.grid,
      answer: p.lights.map(l => [l.r, l.c]),
      maxLights: p.maxLights
    }, null, 2));
    console.log(`  ✓ maxLights=${p.maxLights}`);
  } else {
    console.log(`  ✗ 生成失败`);
  }
}

console.log('完成！');
