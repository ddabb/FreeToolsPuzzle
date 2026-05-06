/**
 * Masyu 回溯求解器
 * 用于验证唯一解
 */

const fs = require('fs');
const path = require('path');

/**
 * 求解 Masyu 谜题
 * @param {Array} pearls 珍珠数组 [{r, c, type}]
 * @param {number} dotSize 格点尺寸
 * @returns {Array} 所有解（路径数组）
 */
function solveMasyu(pearls, dotSize) {
  const solutions = [];
  
  // 构建珍珠约束
  const pearlMap = new Map();
  pearls.forEach(p => pearlMap.set(`${p.r},${p.c}`, p.type));
  
  // 格点邻接关系
  function getNeighbors(r, c) {
    const neighbors = [];
    if (r > 0) neighbors.push({ r: r - 1, c });
    if (r < dotSize - 1) neighbors.push({ r: r + 1, c });
    if (c > 0) neighbors.push({ r, c: c - 1 });
    if (c < dotSize - 1) neighbors.push({ r, c: c + 1 });
    return neighbors;
  }
  
  // 检查珍珠约束
  function checkPearlConstraint(path, idx, pearlR, pearlC, pearlType) {
    const prev = path[(idx - 1 + path.length) % path.length];
    const curr = path[idx];
    const next = path[(idx + 1) % path.length];
    
    const dir1 = { dr: prev.r - curr.r, dc: prev.c - curr.c };
    const dir2 = { dr: next.r - curr.r, dc: next.c - curr.c };
    
    if (pearlType === 'black') {
      // 黑珠：必须转弯
      const isTurn = dir1.dr * dir2.dr + dir1.dc * dir2.dc === 0;
      if (!isTurn) return false;
      
      // 黑珠：前后各至少延伸1格
      // 向前检查
      let forwardCount = 0;
      let checkIdx = idx;
      let checkDir = dir2;
      for (let i = 0; i < 1; i++) {
        const nextIdx = (checkIdx + 1) % path.length;
        const nextPoint = path[nextIdx];
        const newDir = { dr: nextPoint.r - path[checkIdx].r, dc: nextPoint.c - path[checkIdx].c };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          forwardCount++;
          checkIdx = nextIdx;
        } else break;
      }
      
      // 向后检查
      let backwardCount = 0;
      checkIdx = idx;
      checkDir = dir1;
      for (let i = 0; i < 1; i++) {
        const prevIdx = (checkIdx - 1 + path.length) % path.length;
        const prevPoint = path[prevIdx];
        const newDir = { dr: path[checkIdx].r - prevPoint.r, dc: path[checkIdx].c - prevPoint.c };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          backwardCount++;
          checkIdx = prevIdx;
        } else break;
      }
      
      return forwardCount >= 1 && backwardCount >= 1;
    } else {
      // 白珠：必须直行
      const isStraight = (dir1.dr + dir2.dr === 0) && (dir1.dc + dir2.dc === 0);
      if (!isStraight) return false;
      
      // 白珠：前后各至少延伸2格
      let forwardCount = 0;
      let checkIdx = idx;
      let checkDir = dir2;
      while (true) {
        const nextIdx = (checkIdx + 1) % path.length;
        const nextPoint = path[nextIdx];
        const newDir = { dr: nextPoint.r - path[checkIdx].r, dc: nextPoint.c - path[checkIdx].c };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          forwardCount++;
          checkIdx = nextIdx;
        } else break;
        if (forwardCount >= 2) break;
      }
      
      let backwardCount = 0;
      checkIdx = idx;
      checkDir = dir1;
      while (true) {
        const prevIdx = (checkIdx - 1 + path.length) % path.length;
        const prevPoint = path[prevIdx];
        const newDir = { dr: path[checkIdx].r - prevPoint.r, dc: path[checkIdx].c - prevPoint.c };
        if (newDir.dr === checkDir.dr && newDir.dc === checkDir.dc) {
          backwardCount++;
          checkIdx = prevIdx;
        } else break;
        if (backwardCount >= 2) break;
      }
      
      return forwardCount >= 2 && backwardCount >= 2;
    }
  }
  
  // 验证完整路径
  function validatePath(path) {
    // 检查所有珍珠约束
    for (let i = 0; i < path.length; i++) {
      const key = `${path[i].r},${path[i].c}`;
      if (pearlMap.has(key)) {
        const type = pearlMap.get(key);
        if (!checkPearlConstraint(path, i, path[i].r, path[i].c, type)) {
          return false;
        }
      }
    }
    
    // 检查所有珍珠是否在路径上
    for (const pearl of pearls) {
      const onPath = path.some(p => p.r === pearl.r && p.c === pearl.c);
      if (!onPath) return false;
    }
    
    return true;
  }
  
  // 回溯搜索
  function backtrack(path, visited, startR, startC) {
    // 限制解的数量（避免爆炸）
    if (solutions.length >= 2) return;
    
    const last = path[path.length - 1];
    
    // 如果回到起点且路径足够长
    if (path.length > 1 && last.r === startR && last.c === startC) {
      if (path.length > dotSize * dotSize * 0.5 && validatePath(path)) {
        solutions.push([...path]);
      }
      return;
    }
    
    // 尝试所有邻居
    const neighbors = getNeighbors(last.r, last.c);
    for (const neighbor of neighbors) {
      const key = `${neighbor.r},${neighbor.c}`;
      
      // 回到起点
      if (neighbor.r === startR && neighbor.c === startC && path.length > 2) {
        path.push(neighbor);
        backtrack(path, visited, startR, startC);
        path.pop();
        continue;
      }
      
      // 访问未访问的节点
      if (!visited.has(key)) {
        visited.add(key);
        path.push(neighbor);
        backtrack(path, visited, startR, startC);
        path.pop();
        visited.delete(key);
      }
    }
  }
  
  // 从每个格点尝试
  for (let r = 0; r < dotSize; r++) {
    for (let c = 0; c < dotSize; c++) {
      const start = { r, c };
      const visited = new Set([`${r},${c}`]);
      backtrack([start], visited, r, c);
      
      if (solutions.length >= 2) {
        return solutions; // 发现多解，提前返回
      }
    }
  }
  
  return solutions;
}

/**
 * 检查单个谜题是否唯一解
 */
function hasUniqueSolution(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const solutions = solveMasyu(data.pearls, data.dotSize);
  return solutions.length === 1;
}

/**
 * 批量检查
 */
function checkAll(difficulty) {
  const dir = path.join(__dirname, difficulty);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  
  let unique = 0;
  let multi = 0;
  let noSolution = 0;
  
  console.log(`\n检查 ${difficulty} (${files.length} 题)...`);
  
  // 只检查前10题
  const sample = files.slice(0, 10);
  
  for (const file of sample) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const solutions = solveMasyu(data.pearls, data.dotSize);
    
    if (solutions.length === 1) {
      unique++;
      console.log(`  ${file}: 唯一解 ✓`);
    } else if (solutions.length === 0) {
      noSolution++;
      console.log(`  ${file}: 无解 ✗`);
    } else {
      multi++;
      console.log(`  ${file}: ${solutions.length}个解 ✗`);
    }
  }
  
  console.log(`\n样本统计 (前10题):`);
  console.log(`  唯一解: ${unique}`);
  console.log(`  多解: ${multi}`);
  console.log(`  无解: ${noSolution}`);
  
  return { unique, multi, noSolution };
}

// 主程序
const args = process.argv.slice(2);
if (args.length === 0) {
  checkAll('easy');
} else {
  args.forEach(diff => checkAll(diff));
}
