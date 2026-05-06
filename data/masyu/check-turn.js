const puzzle = require('./easy/easy-0066.json');
const path = puzzle.path;
const dotSize = puzzle.dotSize;

const whiteIdx = 44; // (6,2)
const pos = path.indexOf(whiteIdx);

// 注意：path是环形数组，pos=38
// path[pos] 是白珠的前一个（因为path从某处开始，白珠在pos=38）
// 但 _pathToLines 连接的是 path[i] 和 path[(i+1)%length]
// 所以需要确认：在lines中谁和谁相连

console.log('=== 路径连接关系 ===');
for (let i = 0; i < path.length; i++) {
  const curr = path[i];
  const next = path[(i + 1) % path.length];
  const cr = Math.floor(curr / dotSize), cc = curr % dotSize;
  const nr = Math.floor(next / dotSize), nc = next % dotSize;
  const marker = (curr === whiteIdx || next === whiteIdx) ? ' ○' : '';
  if (marker) console.log(`  [${i}] (${cr},${cc}) -> (${nr},${nc})${marker}`);
}

// 确认白珠的"前驱"和"后继"
const prevInPath = path[(pos - 1 + path.length) % path.length]; // path[37]
const nextInPath = path[(pos + 1) % path.length]; // path[39]

console.log(`\n白珠 idx=${whiteIdx} 在 path[${pos}]`);
console.log(`  path[${pos-1}]=${prevInPath} (${Math.floor(prevInPath/dotSize)},${prevInPath%dotSize}) <- 这是前驱`);
console.log(`  path[${pos}]=${whiteIdx} (6,2) <- 白珠`);
console.log(`  path[${pos+1}]=${nextInPath} (${Math.floor(nextInPath/dotSize)},${nextInPath%dotSize}) <- 这是后继`);

// 关键：_pathToLines 中线段连接的是 path[i] -> path[i+1]
// 所以白珠参与的两条线段是：
// 1. path[37] -> path[38] 即 prevInPath -> whiteIdx  
// 2. path[38] -> path[39] 即 whiteIdx -> nextInPath
const p1_r = Math.floor(prevInPath/dotSize), p1_c = prevInPath%dotSize;
const n1_r = Math.floor(nextInPath/dotSize), n1_c = nextInPath%dotSize;

console.log(`\n线段1: (${p1_r},${p1_c}) -> (6,2)`);
console.log(`线段2: (6,2) -> (${n1_r},${n1_c})`);

// 检查是否直行
const isStraight = (p1_r === n1_r) || (p1_c === n1_c);
console.log(`\n直行检查: ${isStraight ? 'YES ✅' : 'NO ❌ 转弯了!'}`);

if (!isStraight) {
  console.log(`\n⚠️ 白珠(6,2)处路径转弯了！这违反白珠规则！`);
  console.log(`   前驱(${p1_r},${p1_c}), 后继(${n1_r},${n1_c})`);
}
