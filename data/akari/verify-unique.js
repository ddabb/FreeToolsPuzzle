/**
 * Akari谜题批量验证唯一性
 * 从现有题库中筛选出唯一解的谜题
 */

const fs = require('fs');
const path = require('path');

// 验证唯一解的求解器（优化版）
function hasUniqueSolution(grid, maxSolutions = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  const emptyCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  
  let solutionCount = 0;
  let firstSolution = null;
  
  function isValidPlacement(lights, r, c) {
    for (const light of lights) {
      if (light.r === r || light.c === c) {
        const minR = Math.min(light.r, r);
        const maxR = Math.max(light.r, r);
        const minC = Math.min(light.c, c);
        const maxC = Math.max(light.c, c);
        
        if (light.r === r) {
          for (let cc = minC + 1; cc < maxC; cc++) {
            if (grid[r][cc] > 0) return true;
          }
          return false;
        } else {
          for (let rr = minR + 1; rr < maxR; rr++) {
            if (grid[rr][c] > 0) return true;
          }
          return false;
        }
      }
    }
    return true;
  }
  
  function allCellsLit(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) {
          let lit = false;
          for (const light of lights) {
            if (light.r === r && light.c === c) {
              lit = true;
              break;
            }
            if (light.r === r) {
              const minC = Math.min(light.c, c);
              const maxC = Math.max(light.c, c);
              let blocked = false;
              for (let cc = minC + 1; cc < maxC; cc++) {
                if (grid[r][cc] > 0) {
                  blocked = true;
                  break;
                }
              }
              if (!blocked) {
                lit = true;
                break;
              }
            }
            if (light.c === c) {
              const minR = Math.min(light.r, r);
              const maxR = Math.max(light.r, r);
              let blocked = false;
              for (let rr = minR + 1; rr < maxR; rr++) {
                if (grid[rr][c] > 0) {
                  blocked = true;
                  break;
                }
              }
              if (!blocked) {
                lit = true;
                break;
              }
            }
          }
          if (!lit) return false;
        }
      }
    }
    return true;
  }
  
  function checkNumberConstraints(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > 0 && grid[r][c] < 5) {
          let count = 0;
          const neighbors = [
            { r: r - 1, c },
            { r: r + 1, c },
            { r, c: c - 1 },
            { r, c: c + 1 }
          ];
          for (const n of neighbors) {
            if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
              if (lights.some(l => l.r === n.r && l.c === n.c)) {
                count++;
              }
            }
          }
          if (count !== grid[r][c]) return false;
        }
      }
    }
    return true;
  }
  
  function backtrack(index, lights) {
    if (solutionCount >= maxSolutions) return;
    if (!checkNumberConstraints(lights)) return;
    
    if (index === emptyCells.length) {
      if (allCellsLit(lights) && checkNumberConstraints(lights)) {
        solutionCount++;
        if (solutionCount === 1) {
          firstSolution = [...lights];
        }
      }
      return;
    }
    
    const cell = emptyCells[index];
    
    backtrack(index + 1, lights);
    if (solutionCount >= maxSolutions) return;
    
    if (isValidPlacement(lights, cell.r, cell.c)) {
      lights.push(cell);
      backtrack(index + 1, lights);
      lights.pop();
    }
  }
  
  backtrack(0, []);
  
  return {
    unique: solutionCount === 1,
    count: solutionCount,
    solution: firstSolution
  };
}

// 主函数：验证现有题库
async function main() {
  console.log('开始验证Akari题库唯一性...\n');
  
  const difficulties = ['easy', 'medium', 'hard'];
  const results = {
    easy: { total: 0, unique: 0, multi: 0, noSolution: 0 },
    medium: { total: 0, unique: 0, multi: 0, noSolution: 0 },
    hard: { total: 0, unique: 0, multi: 0, noSolution: 0 }
  };
  
  const startTime = Date.now();
  
  for (const diff of difficulties) {
    console.log(`\n验证 ${diff} 难度...`);
    
    // 扁平结构：文件名格式为 difficulty-XXXX.json
    const allFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.json') && f.startsWith(diff));
    console.log(`  找到 ${allFiles.length} 个文件`);
    
    const uniqueDir = path.join(__dirname, `${diff}-unique`);
    if (!fs.existsSync(uniqueDir)) {
      fs.mkdirSync(uniqueDir, { recursive: true });
    }
    
    let count = 0;
    for (const file of allFiles) {
      count++;
      const filepath = path.join(__dirname, file);
      const puzzle = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      // 将' '转换为0
      const grid = puzzle.grid.map(row => row.map(cell => cell === ' ' ? 0 : cell));
      
      const result = hasUniqueSolution(grid);
      
      results[diff].total++;
      if (result.count === 0) {
        results[diff].noSolution++;
      } else if (result.count === 1) {
        results[diff].unique++;
        // 更新文件，添加answer和unique字段
        fs.writeFileSync(filepath, JSON.stringify({
          ...puzzle,
          answer: result.solution,
          unique: true
        }, null, 2));
      } else {
        results[diff].multi++;
        // 删除多解的文件
        fs.unlinkSync(filepath);
      }
      
      if (count % 10 === 0) {
        console.log(`  已验证: ${count}/${allFiles.length}`);
      }
    }
    
    console.log(`  完成: 总数=${results[diff].total}, 唯一解=${results[diff].unique}, 多解=${results[diff].multi}, 无解=${results[diff].noSolution}`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n总耗时: ${elapsed}秒`);
  
  // 汇总
  console.log('\n=== 汇总 ===');
  let totalUnique = 0;
  for (const diff of difficulties) {
    console.log(`${diff}: ${results[diff].unique}/${results[diff].total} 唯一解`);
    totalUnique += results[diff].unique;
  }
  console.log(`总计: ${totalUnique} 个唯一解谜题`);
}

main().catch(console.error);
