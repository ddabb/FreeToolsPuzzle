/**
 * Masyu 唯一解验证求解器 v2 - 优化版
 * 添加约束传播剪枝，大幅提升速度
 */

/**
 * 约束传播：根据珍珠推导必定的边
 */
function propagateConstraints(pearls, dotSize) {
  const mustHave = new Set();  // 必须有的边
  const mustNot = new Set();   // 必须没有的边
  
  const pearlMap = new Map();
  for (const p of pearls) {
    pearlMap.set(`${p.r},${p.c}`, p.type);
  }
  
  for (const pearl of pearls) {
    const { r, c, type } = pearl;
    
    // 统计该点可能的方向
    const possibleDirs = [];
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) continue;
        possibleDirs.push({ dr, dc, nr, nc });
      }
    }
    
    if (possibleDirs.length < 2) return null; // 无法形成路径
    
    if (type === 'black') {
      // 黑珠：必须转弯
      // 推导：如果某方向是唯一可行方向，则不能选（因为转弯需要两个方向）
      // 暂时无法直接推导必定边
      
    } else {
      // 白珠：必须直行
      // 检查是否有方向可以延伸至少2格
      const validDirs = [];
      for (const dir of possibleDirs) {
        let count = 0;
        let cr = dir.nr;
        let cc = dir.nc;
        
        while (cr >= 0 && cr < dotSize && cc >= 0 && cc < dotSize && count < 2) {
          const nr = cr + dir.dr;
          const nc = cc + dir.dc;
          if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) break;
          cr = nr;
          cc = nc;
          count++;
        }
        
        if (count >= 2) {
          validDirs.push(dir);
        }
      }
      
      // 如果只有一个可行方向对（相反的两个方向），则必须选这对
      if (validDirs.length === 2) {
        const [d1, d2] = validDirs;
        if (d1.dr === -d2.dr && d1.dc === -d2.dc) {
          // 这对方向必须选
          mustHave.add(`${r},${c},${d1.nr},${d1.nc}`);
          mustHave.add(`${r},${c},${d2.nr},${d2.nc}`);
        }
      }
    }
  }
  
  return { mustHave, mustNot };
}

/**
 * 快速检查：边数是否合理
 */
function quickCheck(pearls, dotSize) {
  // 每个珍珠至少需要2条边
  // 总边数 = 格点数（因为每点恰好2度）
  const minEdges = pearls.length * 2;
  const maxEdges = dotSize * dotSize;
  
  return minEdges <= maxEdges;
}

/**
 * 统计解的数量
 */
function countSolutions(pearls, dotSize, maxCount = 2) {
  // 快速检查
  if (!quickCheck(pearls, dotSize)) return 0;
  
  // 约束传播
  const constraints = propagateConstraints(pearls, dotSize);
  if (!constraints) return 0;
  
  const pearlMap = new Map();
  for (const p of pearls) {
    pearlMap.set(`${p.r},${p.c}`, p.type);
  }
  
  if (pearls.length === 0) return 0;
  
  // 从第一个珍珠开始
  const start = pearls[0];
  let solutionCount = 0;
  
  /**
   * 检查点的约束
   */
  function checkPoint(r, c, edgeSet) {
    const pearlType = pearlMap.get(`${r},${c}`);
    
    // 统计连接的边
    const connected = [];
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) continue;
        if (edgeSet.has(`${r},${c},${nr},${nc}`) || edgeSet.has(`${nr},${nc},${r},${c}`)) {
          connected.push({ dr, dc });
        }
      }
    }
    
    // 度数检查
    if (connected.length > 2) return false;
    
    if (!pearlType || connected.length < 2) return true;
    
    // 珍珠约束检查
    if (pearlType === 'black') {
      // 黑珠：转弯
      const [e1, e2] = connected;
      return (e1.dr * e2.dr + e1.dc * e2.dc) === 0;
    } else {
      // 白珠：直行
      const [e1, e2] = connected;
      return (e1.dr * e2.dc - e1.dc * e2.dr) === 0;
    }
  }
  
  /**
   * 检查是否单一闭合回路
   */
  function isSingleLoop(edgeSet) {
    if (edgeSet.size === 0) return false;
    
    const degree = new Map();
    for (const edge of edgeSet) {
      const [r1, c1, r2, c2] = edge.split(',').map(Number);
      degree.set(`${r1},${c1}`, (degree.get(`${r1},${c1}`) || 0) + 1);
      degree.set(`${r2},${c2}`, (degree.get(`${r2},${c2}`) || 0) + 1);
    }
    
    // 所有度数必须为2
    for (const [key, deg] of degree) {
      if (deg !== 2) return false;
    }
    
    // BFS检查连通性
    const firstEdge = edgeSet.values().next().value;
    const [startR, startC] = firstEdge.split(',').map(Number);
    const visited = new Set([`${startR},${startC}`]);
    const queue = [[startR, startC]];
    
    while (queue.length > 0) {
      const [cr, cc] = queue.shift();
      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) continue;
          if (visited.has(`${nr},${nc}`)) continue;
          if (edgeSet.has(`${cr},${cc},${nr},${nc}`) || edgeSet.has(`${nr},${nc},${cr},${cc}`)) {
            visited.add(`${nr},${nc}`);
            queue.push([nr, nc]);
          }
        }
      }
    }
    
    return visited.size === degree.size;
  }
  
  /**
   * 回溯搜索（带深度限制）
   */
  function backtrack(r, c, edgeSet, visited, depth) {
    // 深度限制（防止超时）
    if (depth > dotSize * dotSize * 2) return false;
    
    // 回到起点
    if (r === start.r && c === start.c && edgeSet.size > 0) {
      if (isSingleLoop(edgeSet)) {
        solutionCount++;
        return solutionCount >= maxCount;
      }
      return false;
    }
    
    // 尝试四个方向
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      
      if (nr < 0 || nr >= dotSize || nc < 0 || nc >= dotSize) continue;
      
      const edgeKey = `${r},${c},${nr},${nc}`;
      const edgeKeyRev = `${nr},${nc},${r},${c}`;
      
      if (edgeSet.has(edgeKey) || edgeSet.has(edgeKeyRev)) continue;
      
      // 回到起点
      if (nr === start.r && nc === start.c) {
        edgeSet.add(edgeKey);
        if (checkPoint(r, c, edgeSet) && checkPoint(nr, nc, edgeSet)) {
          if (backtrack(nr, nc, edgeSet, visited, depth + 1)) return true;
        }
        edgeSet.delete(edgeKey);
        continue;
      }
      
      if (visited.has(`${nr},${nc}`)) continue;
      
      // 添加边
      edgeSet.add(edgeKey);
      visited.add(`${nr},${nc}`);
      
      if (checkPoint(r, c, edgeSet) && checkPoint(nr, nc, edgeSet)) {
        if (backtrack(nr, nc, edgeSet, visited, depth + 1)) return true;
      }
      
      edgeSet.delete(edgeKey);
      visited.delete(`${nr},${nc}`);
    }
    
    return false;
  }
  
  // 开始搜索
  backtrack(start.r, start.c, new Set([...constraints.mustHave]), new Set([`${start.r},${start.c}`]), 0);
  
  return solutionCount;
}

function hasUniqueSolution(pearls, dotSize) {
  return countSolutions(pearls, dotSize, 2) === 1;
}

module.exports = { countSolutions, hasUniqueSolution };
