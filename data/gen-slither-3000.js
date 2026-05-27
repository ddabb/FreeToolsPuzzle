/**
 * 数回(Slither Link) 补充生成器 v2
 * 策略：Wilson 算法生成随机生成树，然后取其对偶 → 一个环
 * 实际更简单：直接用 loop-erased random walk 在对偶图上生成环
 * 
 * 最简策略：生成随机环的步骤
 * 1. 在 (rows+1)x(cols+1) 的点阵上，随机选起点
 * 2. 随机行走，每步走上下左右，不能重复访问边
 * 3. 如果回到起点且满足度数约束 → 成功
 * 
 * 更可靠：用已有算法——在网格的对偶图上生成一个简单回路
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'slither-link');

// 导入求解器
const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dataDir, 'slitherlink-solver.js'), 'utf-8'), sandbox);
const solve = sandbox.solve;

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * 在网格上生成一个随机简单回路
 * 使用方法：先在 dot 网格上随机行走形成环
 * 
 * 更好的方法：直接随机化DFS
 * 在 rows x cols 的单元格上：
 * 1. 初始化所有边为空
 * 2. 随机选一个起始单元格，标记为"环内"
 * 3. 随机生长环的边界直到闭合
 * 
 * 最可靠的方法：从完整网格随机删边，保证每个顶点度数为0或2
 * 实际上就是：随机生成一个回路（loop）
 * 
 * 用最简单的方法：
 * 1. 随机排列所有边
 * 2. 依次尝试加入边，检查是否保持度数≤2
 * 3. 最后检查是否形成一个闭环
 */

function generateLoop(rows, cols, rand) {
  // 所有边列表
  const edges = [];
  // h edges: between dot(r,c) and dot(r,c+1), r=0..rows, c=0..cols-1
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      edges.push({ type: 'h', r, c });
    }
  }
  // v edges: between dot(r,c) and dot(r+1,c), r=0..rows-1, c=0..cols
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      edges.push({ type: 'v', r, c });
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }
  
  // 初始化
  const h = Array.from({ length: rows + 1 }, () => Array(cols).fill(0));
  const v = Array.from({ length: rows }, () => Array(cols + 1).fill(0));
  const degree = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));
  
  // 依次加边
  for (const edge of edges) {
    let r1, c1, r2, c2;
    if (edge.type === 'h') {
      r1 = edge.r; c1 = edge.c;
      r2 = edge.r; c2 = edge.c + 1;
    } else {
      r1 = edge.r; c1 = edge.c;
      r2 = edge.r + 1; c2 = edge.c;
    }
    
    if (degree[r1][c1] < 2 && degree[r2][c2] < 2) {
      // 暂时加入
      if (edge.type === 'h') h[edge.r][edge.c] = 1;
      else v[edge.r][edge.c] = 1;
      degree[r1][c1]++;
      degree[r2][c2]++;
    }
  }
  
  // 检查连通性 - 只保留连通的环部分
  // 找到一个度数>0的顶点，BFS
  let startR = -1, startC = -1;
  for (let r = 0; r <= rows && startR < 0; r++) {
    for (let c = 0; c <= cols; c++) {
      if (degree[r][c] === 2) { startR = r; startC = c; break; }
    }
  }
  
  if (startR < 0) return null;
  
  // BFS 找所有连通的边
  const visited = new Set();
  const queue = [[startR, startC]];
  visited.add(`${startR},${startC}`);
  
  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    // 上: v[cr-1][cc] if exists
    if (cr > 0 && v[cr-1][cc] && !visited.has(`${cr-1},${cc}`)) {
      visited.add(`${cr-1},${cc}`); queue.push([cr-1, cc]);
    }
    // 下
    if (cr < rows && v[cr][cc] && !visited.has(`${cr+1},${cc}`)) {
      visited.add(`${cr+1},${cc}`); queue.push([cr+1, cc]);
    }
    // 左
    if (cc > 0 && h[cr][cc-1] && !visited.has(`${cr},${cc-1}`)) {
      visited.add(`${cr},${cc-1}`); queue.push([cr, cc-1]);
    }
    // 右
    if (cc < cols && h[cr][cc] && !visited.has(`${cr},${cc+1}`)) {
      visited.add(`${cr},${cc+1}`); queue.push([cr, cc+1]);
    }
  }
  
  // 删除不在连通部分中的边
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (h[r][c]) {
        const d1 = visited.has(`${r},${c}`);
        const d2 = visited.has(`${r},${c+1}`);
        if (!d1 || !d2) {
          h[r][c] = 0;
          degree[r][c]--;
          degree[r][c+1]--;
        }
      }
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (v[r][c]) {
        const d1 = visited.has(`${r},${c}`);
        const d2 = visited.has(`${r+1},${c}`);
        if (!d1 || !d2) {
          v[r][c] = 0;
          degree[r][c]--;
          degree[r+1][c]--;
        }
      }
    }
  }
  
  // 验证所有活跃顶点度数为2
  let edgeCount = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (degree[r][c] > 0 && degree[r][c] !== 2) return null;
      if (degree[r][c] === 2) edgeCount++;
    }
  }
  
  // 需要足够的边（至少4条）
  if (edgeCount < 4) return null;
  
  return { h, v };
}

/**
 * 从答案中提取线索（随机隐藏部分线索增加难度）
 */
function extractHints(rows, cols, h, v, rand, hintProbability) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      let count = 0;
      if (h[r][c]) count++;
      if (h[r+1][c]) count++;
      if (v[r][c]) count++;
      if (v[r][c+1]) count++;
      
      // 根据概率决定是否显示线索
      if (count === 0 || rand() < hintProbability) {
        grid[r][c] = count;
      } else {
        grid[r][c] = -1; // 隐藏线索（-1 表示无提示）
      }
    }
  }
  return grid;
}

function generatePuzzle(size, seed) {
  const rand = seededRand(seed);
  const rows = size, cols = size;
  
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const loop = generateLoop(rows, cols, seededRand(seed * 1000 + attempt));
    if (!loop) continue;
    
    // 先尝试带所有线索
    const fullGrid = [];
    for (let r = 0; r < rows; r++) {
      fullGrid[r] = [];
      for (let c = 0; c < cols; c++) {
        let count = 0;
        if (loop.h[r][c]) count++;
        if (loop.h[r+1][c]) count++;
        if (loop.v[r][c]) count++;
        if (loop.v[r][c+1]) count++;
        fullGrid[r][c] = count;
      }
    }
    
    // 用求解器验证（完整线索应该有唯一解）
    try {
      const result = solve(fullGrid);
      if (!result) continue;
      
      // 验证解一致
      let match = true;
      for (let r = 0; r <= rows && match; r++) {
        for (let c = 0; c < cols && match; c++) {
          if (result.h[r][c] !== loop.h[r][c]) match = false;
        }
      }
      for (let r = 0; r < rows && match; r++) {
        for (let c = 0; c <= cols && match; c++) {
          if (result.v[r][c] !== loop.v[r][c]) match = false;
        }
      }
      
      if (!match) continue;
      
      // 完整线索的版本有唯一解，直接使用
      // （后续可以逐步删除线索来增加难度，但先用完整线索确保可靠性）
      return {
        size,
        grid: fullGrid,
        answer: { h: loop.h, v: loop.v }
      };
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

function main() {
  const difficulties = [
    { name: 'easy', size: 5, existing: 201, target: 1000 },
    { name: 'medium', size: 7, existing: 101, target: 1000 },
    { name: 'hard', size: 10, existing: 51, target: 1000 }
  ];
  
  let totalGenerated = 0;
  
  for (const diff of difficulties) {
    const needed = diff.target - diff.existing;
    console.log(`${diff.name}: existing=${diff.existing}, need=${needed}, size=${diff.size}x${diff.size}`);
    
    if (needed <= 0) {
      console.log(`  Already satisfied, skipping`);
      continue;
    }
    
    let generated = 0;
    let seed = diff.existing * 100 + 1;
    const startTime = Date.now();
    
    while (generated < needed) {
      const puzzle = generatePuzzle(diff.size, seed);
      
      if (puzzle) {
        generated++;
        const id = diff.existing + generated;
        const item = {
          id,
          difficulty: diff.name,
          size: puzzle.size,
          grid: puzzle.grid,
          answer: puzzle.answer,
          seed
        };
        
        const filename = `${diff.name}-${String(id).padStart(4, '0')}.json`;
        const subdir = path.join(dataDir, diff.name);
        if (!fs.existsSync(subdir)) fs.mkdirSync(subdir, { recursive: true });
        fs.writeFileSync(path.join(subdir, filename), JSON.stringify(item));
        
        totalGenerated++;
        if (generated % 50 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ${diff.name}: ${generated}/${needed} (${elapsed}s)`);
        }
      }
      
      seed++;
      // 超时保护
      if ((Date.now() - startTime) / 1000 > 240) {
        console.log(`  ${diff.name}: timeout after ${generated} generated`);
        break;
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ${diff.name} done: ${generated} in ${elapsed}s`);
  }
  
  // Update index
  const allFiles = [];
  for (const diff of difficulties) {
    const subdir = path.join(dataDir, diff.name);
    if (fs.existsSync(subdir)) {
      const count = fs.readdirSync(subdir).filter(f => f.endsWith('.json')).length;
      console.log(`  ${diff.name}: ${count} total files`);
      fs.readdirSync(subdir).filter(f => f.endsWith('.json')).forEach(f => allFiles.push(`${diff.name}/${f}`));
    }
  }
  
  const index = {
    total: allFiles.length,
    difficulties: difficulties.map(d => d.name),
    generatedAt: new Date().toISOString(),
    files: allFiles.sort()
  };
  fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(index));
  
  console.log(`\nTotal generated: ${totalGenerated}, total files: ${allFiles.length}`);
}

main();
