const fs = require('fs');
const path = require('path');

// 极简生成：先放少量墙，再用贪心放灯塔
function gen(size) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 随机放5-8个墙
  const wallCount = 5 + Math.floor(Math.random() * 4);
  let placed = 0;
  while (placed < wallCount) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (grid[r][c] === 0) { grid[r][c] = 1; placed++; }
  }
  
  // 贪心放灯塔照亮所有格子
  const lights = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      // 检查是否已被照亮
      let lit = lights.some(l => l.r === r || l.c === c);
      if (!lit) lights.push({ r, c });
    }
  }
  
  // 给部分墙加数字
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1 && Math.random() < 0.4) {
        let cnt = 0;
        for (const [nr, nc] of [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]) {
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights.some(l => l.r === nr && l.c === nc)) cnt++;
        }
        grid[r][c] = cnt + 2;
      }
    }
  }
  
  return { grid, lights };
}

const dir = 'F:/SelfJob/FreeToolsPuzzle/data/akari/hard';
for (let i = 992; i <= 1000; i++) {
  const p = gen(12);
  fs.writeFileSync(path.join(dir, `hard-${String(i).padStart(4,'0')}.json`), 
    JSON.stringify({ id: i, difficulty: 'hard', size: 12, grid: p.grid, answer: p.lights.map(l => [l.r, l.c]) }, null, 2));
  console.log('生成 hard-' + i);
}
console.log('完成！');
