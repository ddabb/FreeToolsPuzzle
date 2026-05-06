/**
 * 调试：检查珍珠候选数量
 */

const { generatePath } = require('./generate-masyu-v11.js');

const dotSize = 7; // easy
const path = generatePath(dotSize);

console.log(`路径长度: ${path.length}`);
console.log(`格点总数: ${dotSize * dotSize}`);
console.log(`路径点: ${path.map(p => `[${p[0]},${p[1]}]`).join(' ')}`);

// 检查每个点的转弯/直行
const candidates = [];

for (let i = 0; i < path.length; i++) {
  const curr = path[i];
  const prev = path[(i - 1 + path.length) % path.length];
  const next = path[(i + 1) % path.length];
  
  const dir1 = { dr: prev[0] - curr[0], dc: prev[1] - curr[1] };
  const dir2 = { dr: next[0] - curr[0], dc: next[1] - curr[1] };
  const isTurn = (dir1.dr * dir2.dr + dir1.dc * dir2.dc) === 0;
  
  console.log(`点${i} [${curr[0]},${curr[1]}]: ${isTurn ? '转弯' : '直行'}`);
}
