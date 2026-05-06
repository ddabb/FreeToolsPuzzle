/**
 * 简单测试：验证珍珠检查逻辑
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

function checkBlackPearl(path, idx) {
  const curr = path[idx];
  const prev = path[(idx - 1 + path.length) % path.length];
  const next = path[(idx + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  
  // 必须转弯
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  if (!isTurn) return false;
  
  // 前后各延伸至少1格
  let forwardCount = 0;
  let checkIdx = (idx + 1) % path.length;
  let checkDir = { dr: -dir2.dr, dc: -dir2.dc };
  for (let step = 0; step < 3; step++) {
    const nextIdx = (checkIdx + 1) % path.length;
    const nextPoint = path[nextIdx];
    const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      forwardCount++;
      checkIdx = nextIdx;
    } else break;
  }
  
  let backwardCount = 0;
  checkIdx = (idx - 1 + path.length) % path.length;
  checkDir = { dr: -dir1.dr, dc: -dir1.dc };
  for (let step = 0; step < 3; step++) {
    const prevIdx = (checkIdx - 1 + path.length) % path.length;
    const prevPoint = path[prevIdx];
    const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      backwardCount++;
      checkIdx = prevIdx;
    } else break;
  }
  
  console.log(`  黑珠 forward=${forwardCount}, backward=${backwardCount}`);
  return forwardCount >= 1 && backwardCount >= 1;
}

function checkWhitePearl(path, idx) {
  const curr = path[idx];
  const prev = path[(idx - 1 + path.length) % path.length];
  const next = path[(idx + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  
  // 必须直行
  const isStraight = (dir1.dr * dir2.dc - dir1.dc * dir2.dr) === 0;
  if (!isStraight) return false;
  
  // 前后各延伸至少2格
  let forwardCount = 0;
  let checkIdx = (idx + 1) % path.length;
  let checkDir = { dr: -dir2.dr, dc: -dir2.dc };
  for (let step = 0; step < 5; step++) {
    const nextIdx = (checkIdx + 1) % path.length;
    const nextPoint = path[nextIdx];
    const newDir = { dr: nextPoint[0] - path[checkIdx][0], dc: nextPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      forwardCount++;
      checkIdx = nextIdx;
    } else break;
  }
  
  let backwardCount = 0;
  checkIdx = (idx - 1 + path.length) % path.length;
  checkDir = { dr: -dir1.dr, dc: -dir1.dc };
  for (let step = 0; step < 5; step++) {
    const prevIdx = (checkIdx - 1 + path.length) % path.length;
    const prevPoint = path[prevIdx];
    const newDir = { dr: prevPoint[0] - path[checkIdx][0], dc: prevPoint[1] - path[checkIdx][1] };
    if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
      backwardCount++;
      checkIdx = prevIdx;
    } else break;
  }
  
  console.log(`  白珠 forward=${forwardCount}, backward=${backwardCount}`);
  return forwardCount >= 2 && backwardCount >= 2;
}

// 测试
const dotSize = 7;
const path = generatePath(dotSize);

console.log(`路径长度: ${path.length}`);

// 检查每个转弯点
let blackValid = 0;
let whiteValid = 0;

console.log('\n转弯点详情:');
for (let i = 0; i < path.length; i++) {
  const curr = path[i];
  const prev = path[(i - 1 + path.length) % path.length];
  const next = path[(i + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  
  if (isTurn) {
    process.stdout.write(`[${i}] (${curr[0]},${curr[1]}) `);
    const valid = checkBlackPearl(path, i);
    if (valid) blackValid++;
  }
}

console.log('\n直行点详情:');
for (let i = 0; i < path.length; i++) {
  const curr = path[i];
  const prev = path[(i - 1 + path.length) % path.length];
  const next = path[(i + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  
  if (!isTurn) {
    process.stdout.write(`[${i}] (${curr[0]},${curr[1]}) `);
    const valid = checkWhitePearl(path, i);
    if (valid) whiteValid++;
  }
}

console.log(`\n结果: 黑珠有效=${blackValid}, 白珠有效=${whiteValid}`);
console.log(`密度 (目标35%): ${((blackValid + whiteValid) / path.length * 100).toFixed(1)}%`);