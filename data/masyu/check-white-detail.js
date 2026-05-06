const puzzle = require('./easy/easy-0066.json');
const path = puzzle.path;
const dotSize = puzzle.dotSize;

const idxToCoord = (idx) => ({ r: Math.floor(idx / dotSize), c: idx % dotSize });

// 找两颗白珠
console.log('=== 白珠规则检查 ===\n');

for (const pearl of puzzle.pearls) {
  if (pearl.type !== 'white') continue;
  
  const pIdx = pearl.r * dotSize + pearl.c;
  const pos = path.indexOf(pIdx);
  
  if (pos < 0) {
    console.log(`白珠 (${pearl.r},${pearl.c}) 不在路径上！❌`);
    continue;
  }
  
  const prevIdx = path[(pos - 1 + path.length) % path.length];
  const nextIdx = path[(pos + 1) % path.length];
  const prev = idxToCoord(prevIdx);
  const next = idxToCoord(nextIdx);
  
  // 检查是否直行
  const isStraight = (prev.r === next.r) || (prev.c === next.c);
  
  // 方向向量
  const dirIn = { r: pearl.r - prev.r, c: pearl.c - prev.c };
  const dirOut = { r: next.r - pearl.r, c: next.c - pearl.c };
  
  // 延伸计数
  let forwardExt = 0;
  let cr = pearl.r + dirOut.r, cc = pearl.c + dirOut.c;
  while (cr >= 0 && cr < dotSize && cc >= 0 && cc < dotSize) {
    if (path.includes(cr * dotSize + cc)) forwardExt++;
    else break;
    cr += dirOut.r; cc += dirOut.c;
  }
  
  let backwardExt = 0;
  cr = pearl.r + dirIn.r; cc = pearl.c + dirIn.c;
  while (cr >= 0 && cr < dotSize && cc >= 0 && cc < dotSize) {
    if (path.includes(cr * dotSize + cc)) backwardExt++;
    else break;
    cr += dirIn.r; cc += dirIn.c;
  }
  
  console.log(`白珠 (${pearl.r},${pearl.c}):`);
  console.log(`  Prev: (${prev.r},${prev.c}), Next: (${next.r},${next.c})`);
  console.log(`  方向入: (${dirIn.r},${dirIn.c}), 方向出: (${dirOut.r},${dirOut.c})`);
  console.log(`  直行: ${isStraight ? '✅' : '❌ 转弯了！'}`);
  console.log(`  向前延伸: ${forwardExt}格, 向后延伸: ${backwardExt}格`);
  console.log(`  延伸≥2: ${forwardExt >= 2 && backwardExt >= 2 ? '✅' : '❌'}`);
  console.log('');
}

// 打印完整路径坐标，看看整体形状
console.log('=== 完整路径 ===');
const coords = path.map(idx => idxToCoord(idx));
// 找到白珠(6,2)附近的路径段
const targetIdx = 6 * dotSize + 2; // (6,2) -> idx 44
const tPos = path.indexOf(targetIdx);
console.log(`\n白珠(6,2) 在路径位置 ${tPos}`);
console.log('附近5个点:');
for (let i = -2; i <= 2; i++) {
  const idx = (tPos - 1 + i + path.length) % path.length;
  const c = coords[idx];
  const marker = idx === tPos ? ' ○白珠' : '';
  console.log(`  [${idx}] (${c.r},${c.c})${marker}`);
}
