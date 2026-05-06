/**
 * Masyu 唯一解验证器
 * 检查珍珠约束是否足够保证唯一解
 */

const fs = require('fs');
const path = require('path');

// 方向向量
const DIRS = [
  { dr: -1, dc: 0, name: 'up' },
  { dr: 1, dc: 0, name: 'down' },
  { dr: 0, dc: -1, name: 'left' },
  { dr: 0, dc: 1, name: 'right' }
];

/**
 * 检查路径是否满足珍珠约束
 */
function checkPearlConstraints(path, pearls, dotSize) {
  const pathSet = new Set(path.map(p => {
    const r = Math.floor(p / dotSize);
    const c = p % dotSize;
    return `${r},${c}`;
  }));

  for (const pearl of pearls) {
    const key = `${pearl.r},${pearl.c}`;
    if (!pathSet.has(key)) {
      return false; // 珍珠不在路径上
    }

    // 找到珍珠在路径中的位置
    const pearlIndex = path.findIndex(p => {
      const r = Math.floor(p / dotSize);
      const c = p % dotSize;
      return r === pearl.r && c === pearl.c;
    });

    const prevIdx = (pearlIndex - 1 + path.length) % path.length;
    const nextIdx = (pearlIndex + 1) % path.length;

    const prev = path[prevIdx];
    const curr = path[pearlIndex];
    const next = path[nextIdx];

    const prevR = Math.floor(prev / dotSize);
    const prevC = prev % dotSize;
    const currR = Math.floor(curr / dotSize);
    const currC = curr % dotSize;
    const nextR = Math.floor(next / dotSize);
    const nextC = next % dotSize;

    const dx1 = currC - prevC;
    const dy1 = currR - prevR;
    const dx2 = nextC - currC;
    const dy2 = nextR - currR;

    if (pearl.type === 'black') {
      // 黑珠：必须转弯
      if (dx1 === dx2 && dy1 === dy2) {
        return false; // 直线通过，违反黑珠规则
      }
    } else if (pearl.type === 'white') {
      // 白珠：必须直行，且前后各延伸2格
      if (dx1 !== dx2 || dy1 !== dy2) {
        return false; // 转弯，违反白珠规则
      }

      // 检查前后延伸至少2格
      const forwardDir = { dr: dy2, dc: dx2 };
      const backwardDir = { dr: -dy1, dc: -dx1 };

      let forwardCount = 0;
      let backwardCount = 0;

      // 向前检查
      let checkR = currR + forwardDir.dr;
      let checkC = currC + forwardDir.dc;
      for (let i = 0; i < 2; i++) {
        if (checkR >= 0 && checkR < dotSize && checkC >= 0 && checkC < dotSize) {
          if (pathSet.has(`${checkR},${checkC}`)) {
            forwardCount++;
          }
        }
        checkR += forwardDir.dr;
        checkC += forwardDir.dc;
      }

      // 向后检查
      checkR = currR + backwardDir.dr;
      checkC = currC + backwardDir.dc;
      for (let i = 0; i < 2; i++) {
        if (checkR >= 0 && checkR < dotSize && checkC >= 0 && checkC < dotSize) {
          if (pathSet.has(`${checkR},${checkC}`)) {
            backwardCount++;
          }
        }
        checkR += backwardDir.dr;
        checkC += backwardDir.dc;
      }

      if (forwardCount < 2 || backwardCount < 2) {
        return false; // 延伸不足2格
      }
    }
  }

  return true;
}

/**
 * 简化版：检查珍珠约束密度
 * 更严格的启发式：黑珠+白珠约束强度估算
 */
function estimateUniqueness(pearls, dotSize) {
  const totalCells = dotSize * dotSize;
  
  // 黑珠：强制转弯，约束最强
  // 白珠：强制直线+延伸，约束中等
  const blackPearls = pearls.filter(p => p.type === 'black').length;
  const whitePearls = pearls.filter(p => p.type === 'white').length;
  
  // 粗略估算：每个黑珠约束~10个路径选择，每个白珠约束~5个
  const constraintStrength = blackPearls * 10 + whitePearls * 5;
  
  // 理论路径数 ≈ (dotSize^2)!
  // 如果约束强度 > log(总路径数)，很可能唯一解
  const logPaths = Math.log(totalCells) * totalCells * 0.5;
  
  return constraintStrength > logPaths;
}

/**
 * 验证单个文件
 */
function verifyPuzzle(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // 检查数据完整性
  if (!data.path || !data.pearls || !data.dotSize) {
    return { valid: false, reason: 'missing data' };
  }

  // 检查珍珠约束是否满足
  const constraintsOk = checkPearlConstraints(data.path, data.pearls, data.dotSize);
  if (!constraintsOk) {
    return { valid: false, reason: 'pearl constraints violated' };
  }

  // 估算唯一解可能性
  const likelyUnique = estimateUniqueness(data.pearls, data.dotSize);
  
  return {
    valid: true,
    likelyUnique,
    pearlCount: data.pearls.length,
    blackCount: data.pearls.filter(p => p.type === 'black').length,
    whiteCount: data.pearls.filter(p => p.type === 'white').length
  };
}

/**
 * 批量验证
 */
function verifyAll(difficulty) {
  const dir = path.join(__dirname, difficulty);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  
  let valid = 0;
  let invalid = 0;
  let likelyUnique = 0;
  let unlikely = 0;
  
  const invalidFiles = [];
  
  for (const file of files) {
    const result = verifyPuzzle(path.join(dir, file));
    if (result.valid) {
      valid++;
      if (result.likelyUnique) {
        likelyUnique++;
      } else {
        unlikely++;
      }
    } else {
      invalid++;
      invalidFiles.push({ file, reason: result.reason });
    }
  }
  
  console.log(`\n=== ${difficulty.toUpperCase()} 验证结果 ===`);
  console.log(`总题数: ${files.length}`);
  console.log(`数据有效: ${valid} (${(valid/files.length*100).toFixed(1)}%)`);
  console.log(`数据无效: ${invalid} (${(invalid/files.length*100).toFixed(1)}%)`);
  console.log(`可能唯一解: ${likelyUnique} (${(likelyUnique/valid*100).toFixed(1)}%)`);
  console.log(`可能多解: ${unlikely} (${(unlikely/valid*100).toFixed(1)}%)`);
  
  if (invalidFiles.length > 0 && invalidFiles.length <= 10) {
    console.log('\n无效文件:');
    invalidFiles.forEach(f => console.log(`  ${f.file}: ${f.reason}`));
  }
  
  return { valid, invalid, likelyUnique, unlikely };
}

// 主程序
const args = process.argv.slice(2);
if (args.length === 0) {
  verifyAll('easy');
  verifyAll('medium');
  verifyAll('hard');
} else {
  args.forEach(diff => verifyAll(diff));
}
