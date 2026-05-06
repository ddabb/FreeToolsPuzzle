/**
 * 调试：检查延伸计数逻辑
 */

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

const path = generatePath(7);

// 打印完整路径
console.log('完整路径:');
for (let i = 0; i < path.length; i++) {
  process.stdout.write(`[${i}]${path[i][0]},${path[i][1]} `);
}
console.log('\n');

// 手动检查 idx=0 的 forward 延伸
const idx = 0;
const curr = path[idx];
const prev = path[(idx - 1 + path.length) % path.length];
const next = path[(idx + 1) % path.length];

console.log(`idx=${idx}, curr=(${curr[0]},${curr[1]}), prev=(${prev[0]},${prev[1]}), next=(${next[0]},${next[1]})`);

// 方向：从curr到next
const checkDir = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
console.log(`checkDir = (${checkDir.dr}, ${checkDir.dc})`);

// 跟踪 forward 延伸
let checkIdx = (idx + 1) % path.length;
console.log(`\nForward 跟踪:`);
for (let step = 0; step < 5; step++) {
  const nextIdx = (checkIdx + 1) % path.length;
  const nextPoint = path[nextIdx];
  const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
  
  const match = (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc);
  console.log(`  step${step}: checkIdx=${checkIdx}, nextIdx=${nextIdx}, nextPoint=(${nextPoint[0]},${nextPoint[1]}), newDir=(${newDir.dr},${newDir.dc}), match=${match}`);
  
  if (match) {
    checkIdx = nextIdx;
  } else {
    console.log(`  停止!`);
    break;
  }
}