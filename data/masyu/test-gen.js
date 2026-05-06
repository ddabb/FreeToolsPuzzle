/**
 * 简单测试：生成一题看输出
 */

const fs = require('fs');
const path = require('path');

const DIRS = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 }
];

function generatePath(dotSize) {
  const visited = new Set();
  const path = [];
  
  // 从外圈开始
  for (let c = 0; c < dotSize; c++) {
    path.push([0, c]);
    visited.add(`0,${c}`);
  }
  for (let r = 1; r < dotSize; r++) {
    path.push([r, dotSize - 1]);
    visited.add(`${r},${dotSize - 1}`);
  }
  for (let c = dotSize - 2; c >= 0; c--) {
    path.push([dotSize - 1, c]);
    visited.add(`${dotSize - 1},${c}`);
  }
  for (let r = dotSize - 2; r >= 1; r--) {
    path.push([r, 0]);
    visited.add(`${r},0`);
  }
  
  // 增长扩展
  while (path.length < dotSize * dotSize - 2) {
    const expandable = [];
    
    for (let i = 0; i < path.length; i++) {
      const curr = path[i];
      const next = path[(i + 1) % path.length];
      const dr = next[0] - curr[0];
      const dc = next[1] - curr[1];
      
      for (const dir of DIRS) {
        if (dir.dr === 0 && dr === 0) continue;
        if (dir.dc === 0 && dc === 0) continue;
        
        const newR1 = curr[0] + dir.dr;
        const newC1 = curr[1] + dir.dc;
        const newR2 = next[0] + dir.dr;
        const newC2 = next[1] + dir.dc;
        
        if (newR1 < 0 || newR1 >= dotSize || newC1 < 0 || newC1 >= dotSize) continue;
        if (newR2 < 0 || newR2 >= dotSize || newC2 < 0 || newC2 >= dotSize) continue;
        if (visited.has(`${newR1},${newC1}`) || visited.has(`${newR2},${newC2}`)) continue;
        
        expandable.push({
          index: i,
          newPoints: [[newR1, newC1], [newR2, newC2]]
        });
      }
    }
    
    if (expandable.length === 0) break;
    
    const choice = expandable[Math.floor(Math.random() * expandable.length)];
    const [p1, p2] = choice.newPoints;
    
    path.splice(choice.index + 1, 0, p1, p2);
    visited.add(`${p1[0]},${p1[1]}`);
    visited.add(`${p2[0]},${p2[1]}`);
  }
  
  return path;
}

// 测试生成
const dotSize = 7;
const pathResult = generatePath(dotSize);

console.log(`路径长度: ${pathResult.length}`);
console.log(`格点总数: ${dotSize * dotSize}`);
console.log(`路径覆盖率: ${(pathResult.length / (dotSize * dotSize) * 100).toFixed(1)}%`);

// 检查珍珠候选
let turnCount = 0;
let straightCount = 0;

for (let i = 0; i < pathResult.length; i++) {
  const curr = pathResult[i];
  const prev = pathResult[(i - 1 + pathResult.length) % pathResult.length];
  const next = pathResult[(i + 1) % pathResult.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  
  if (isTurn) turnCount++;
  else straightCount++;
}

console.log(`\n转弯点: ${turnCount}`);
console.log(`直行点: ${straightCount}`);
