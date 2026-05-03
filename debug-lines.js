/**
 * 调试 lines 数据
 */

const fs = require('fs');
const pathModule = require('path');

const OUTPUT_DIR = 'F:/SelfJob/FreeToolsPuzzle/data/masyu';

function readPuzzle(difficulty, index) {
  const filename = `${difficulty}-${index.toString().padStart(4, '0')}.json`;
  const filepath = pathModule.join(OUTPUT_DIR, difficulty, filename);
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

const puzzle = readPuzzle('easy', 1);
const { lines, size } = puzzle;

console.log(`\n题目 easy-0001 的 lines 数据分析:`);
console.log(`网格大小: ${size}x${size}`);
console.log(`\n每格的边数 (degree = top + right + bottom + left):`);

for (let r = 0; r < size; r++) {
  let row = [];
  for (let c = 0; c < size; c++) {
    const l = lines[r][c];
    const deg = (l.top?1:0) + (l.right?1:0) + (l.bottom?1:0) + (l.left?1:0);
    row.push(deg);
  }
  console.log(`  行${r}: [${row.join(', ')}]`);
}

console.log(`\n度数为2的格子数: ${size * size}`);

console.log(`\n查找连通区域...`);

function findConnectedComponent(startR, startC, lines, size) {
  const visited = new Set();
  const queue = [[startR, startC]];
  visited.add(`${startR},${startC}`);
  
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const l = lines[r][c];
    
    if (l.top && !visited.has(`${r-1},${c}`)) {
      visited.add(`${r-1},${c}`);
      queue.push([r-1, c]);
    }
    if (l.bottom && !visited.has(`${r+1},${c}`)) {
      visited.add(`${r+1},${c}`);
      queue.push([r+1, c]);
    }
    if (l.left && !visited.has(`${r},${c-1}`)) {
      visited.add(`${r},${c-1}`);
      queue.push([r, c-1]);
    }
    if (l.right && !visited.has(`${r},${c+1}`)) {
      visited.add(`${r},${c+1}`);
      queue.push([r, c+1]);
    }
  }
  
  return visited;
}

const component1 = findConnectedComponent(0, 0, lines, size);
console.log(`从(0,0)开始的连通区域大小: ${component1.size}`);

const component2 = findConnectedComponent(0, 1, lines, size);
console.log(`从(0,1)开始的连通区域大小: ${component2.size}`);

if (component1.size === size * size) {
  console.log(`\n所有格子通过边连通成一个区域`);
  
  // 尝试找到一条完整的回路
  console.log(`\n尝试追踪回路...`);
  
  function traceLoop(startR, startC, lines, size) {
    const path = [[startR, startC]];
    const visitedEdges = new Set();
    
    let prevR = -1, prevC = -1;
    let cr = startR, cc = startC;
    
    for (let step = 0; step < size * size; step++) {
      const l = lines[cr][cc];
      const nextDirs = [];
      
      if (l.top && !(prevR === cr - 1 && prevC === cc)) nextDirs.push([cr - 1, cc]);
      if (l.bottom && !(prevR === cr + 1 && prevC === cc)) nextDirs.push([cr + 1, cc]);
      if (l.left && !(prevR === cr && prevC === cc - 1)) nextDirs.push([cr, cc - 1]);
      if (l.right && !(prevR === cr && prevC === cc + 1)) nextDirs.push([cr, cc + 1]);
      
      if (nextDirs.length === 0) {
        console.log(`  在(${cr},${cc})无法继续`);
        break;
      }
      
      if (nextDirs.length !== 1) {
        console.log(`  在(${cr},${cc})有${nextDirs.length}个方向可选`);
      }
      
      const [nr, nc] = nextDirs[0];
      
      if (nr === startR && nc === startC) {
        console.log(`  回到起点(${startR},${startC})，回路闭合！`);
        break;
      }
      
      path.push([nr, nc]);
      prevR = cr;
      prevC = cc;
      cr = nr;
      cc = nc;
    }
    
    return path;
  }
  
  const path = traceLoop(0, 1, lines, size);
  console.log(`追踪到的路径长度: ${path.length}`);
  console.log(`路径: ${path.map(([r,c]) => `(${r},${c})`).join(' → ')}`);
}
