const puzzle = require('./easy/easy-0066.json');
const path = puzzle.path;
const dotSize = puzzle.dotSize; // 7

// 白珠 (6,2) -> idx = 6*7+2 = 44
const whiteIdx = 44;
const pos = path.indexOf(whiteIdx);

console.log('dotSize:', dotSize);
console.log('path length:', path.length);
console.log('白珠(6,2) idx:', whiteIdx, 'pos in path:', pos);

// 前后各5个点
console.log('\n=== 白珠(6,2) 附近路径 ===');
for (let d = -5; d <= 5; d++) {
  const idx = ((pos - 1 + d) % path.length + path.length) % path.length;
  const p = path[idx];
  const r = Math.floor(p / dotSize);
  const c = p % dotSize;
  const marker = p === whiteIdx ? ' ○WHITE' : '';
  console.log(`  offset[${d}] path[${idx}] = ${p} -> (${r},${c})${marker}`);
}

// 验证延伸
const prevIdx = path[(pos - 1 + path.length) % path.length]; // 45
const nextIdx = path[(pos + 1) % path.length]; // 43
const prevR = Math.floor(prevIdx / dotSize), prevC = prevIdx % dotSize;
const nextR = Math.floor(nextIdx / dotSize), nextC = nextIdx % dotSize;

console.log(`\nPrev: (${prevR},${prevC}) idx=${prevIdx}`);
console.log(`Next: (${nextR},${nextC}) idx=${nextIdx}`);

// 方向
const dirIn_r = 6 - prevR, dirIn_c = 2 - prevC;
const dirOut_r = nextR - 6, dirOut_c = nextC - 2;
console.log(`dirIn: (${dirIn_r},${dirIn_c}), dirOut: (${dirOut_r},${dirOut_c})`);

// 沿着 dirOut 方向延伸
console.log('\n--- 沿 dirOut 延伸 ---');
let cr = 6 + dirOut_r, cc = 2 + dirOut_c;
let ext = 0;
while (cr >= 0 && cr < dotSize && cc >= 0 && cc < dotSize) {
  const ci = cr * dotSize + cc;
  const onPath = path.includes(ci);
  console.log(`  (${cr},${cc}) idx=${ci} onPath=${onPath}`);
  if (onPath) ext++;
  else { console.log('  -> 不在路径上，停止'); break; }
  cr += dirOut_r; cc += dirOut_c;
}
console.log(`dirOut 延伸: ${ext}格`);

// 沿着 dirIn 反方向延伸（即从白珠往反方向走）
console.log('\n--- 沿 dirIn 反方向延伸 ---');
cr = 6 + dirIn_r; cc = 2 + dirIn_c;
ext = 0;
while (cr >= 0 && cr < dotSize && cc >= 0 && cc < dotSize) {
  const ci = cr * dotSize + cc;
  const onPath = path.includes(ci);
  console.log(`  (${cr},${cc}) idx=${ci} onPath=${onPath}`);
  if (onPath) ext++;
  else { console.log('  -> 不在路径上，停止'); break; }
  cr += dirIn_r; cc += dirIn_c;
}
console.log(`dirIn 反向延伸: ${ext}格`);
