/**
 * Akari谜题生成器 - 唯一解版本
 * 每生成一题立即验证唯一性，不唯一则丢弃
 */

const fs = require('fs');
const path = require('path');

// 验证唯一解的求解器（找到第2个解时立即返回false）
function hasUniqueSolution(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 找到所有空格（可以放灯塔的位置）
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
  
  // 检查放置灯塔后是否合法
  function isValidPlacement(lights, r, c) {
    // 检查同行同列是否有其他灯塔
    for (const light of lights) {
      if (light.r === r || light.c === c) {
        // 检查中间是否有墙（数字格）
        const minR = Math.min(light.r, r);
        const maxR = Math.max(light.r, r);
        const minC = Math.min(light.c, c);
        const maxC = Math.max(light.c, c);
        
        if (light.r === r) {
          // 同行
          let blocked = false;
          for (let cc = minC + 1; cc < maxC; cc++) {
            if (grid[r][cc] > 0) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return false;
        } else {
          // 同列
          let blocked = false;
          for (let rr = minR + 1; rr < maxR; rr++) {
            if (grid[rr][c] > 0) {
              blocked = true;
              break;
            }
          }
          if (!blocked) return false;
        }
      }
    }
    return true;
  }
  
  // 检查灯塔是否照亮所有空格
  function allCellsLit(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) {
          // 检查是否被照亮
          let lit = false;
          for (const light of lights) {
            if (light.r === r && light.c === c) {
              lit = true;
              break;
            }
            // 检查同一行或列
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
  
  // 检查数字约束
  function checkNumberConstraints(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > 0 && grid[r][c] < 5) {
          // 数字格，检查周围灯塔数量
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
  
  // 回溯求解
  function backtrack(index, lights) {
    if (solutionCount >= 2) return; // 已经找到2个解，停止
    
    // 检查当前灯塔布局是否满足数字约束
    if (!checkNumberConstraints(lights)) return;
    
    if (index === emptyCells.length) {
      // 所有空格都考虑过了
      if (allCellsLit(lights) && checkNumberConstraints(lights)) {
        solutionCount++;
        if (solutionCount === 1) {
          firstSolution = [...lights];
        }
      }
      return;
    }
    
    const cell = emptyCells[index];
    
    // 选择1：不放灯塔
    backtrack(index + 1, lights);
    if (solutionCount >= 2) return;
    
    // 选择2：放灯塔
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

// 生成一个谜题（从解推导）
function generatePuzzle(size, difficulty) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 随机放置一些数字墙
  const wallCount = Math.floor(size * size * 0.15); // 15%的格子是墙
  const walls = [];
  
  for (let i = 0; i < wallCount; i++) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (grid[r][c] === 0) {
      grid[r][c] = -1; // 先标记为墙（无数字）
      walls.push({ r, c });
    }
  }
  
  // 生成一个灯塔布局（解）
  const lights = [];
  const emptyCells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  
  // 随机放置灯塔，确保照亮所有格子
  // 这里简化处理，实际需要更复杂的逻辑
  for (const cell of emptyCells) {
    if (Math.random() < 0.3) { // 30%概率放灯塔
      // 检查是否与现有灯塔冲突
      let conflict = false;
      for (const light of lights) {
        if (light.r === cell.r || light.c === cell.c) {
          // 检查中间是否有墙
          const minR = Math.min(light.r, cell.r);
          const maxR = Math.max(light.r, cell.r);
          const minC = Math.min(light.c, cell.c);
          const maxC = Math.max(light.c, cell.c);
          
          if (light.r === cell.r) {
            let blocked = false;
            for (let cc = minC + 1; cc < maxC; cc++) {
              if (grid[cell.r][cc] !== 0) {
                blocked = true;
                break;
              }
            }
            if (!blocked) {
              conflict = true;
              break;
            }
          } else {
            let blocked = false;
            for (let rr = minR + 1; rr < maxR; rr++) {
              if (grid[rr][cell.c] !== 0) {
                blocked = true;
                break;
              }
            }
            if (!blocked) {
              conflict = true;
              break;
            }
          }
        }
      }
      
      if (!conflict) {
        lights.push(cell);
      }
    }
  }
  
  // 根据灯塔布局设置数字墙
  for (const wall of walls) {
    let count = 0;
    const neighbors = [
      { r: wall.r - 1, c: wall.c },
      { r: wall.r + 1, c: wall.c },
      { r: wall.r, c: wall.c - 1 },
      { r: wall.r, c: wall.c + 1 }
    ];
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
        if (lights.some(l => l.r === n.r && l.c === n.c)) {
          count++;
        }
      }
    }
    grid[wall.r][wall.c] = count;
  }
  
  return { grid, lights };
}

// 主函数
async function main() {
  console.log('开始生成Akari谜题（唯一解验证）...\n');
  
  const configs = [
    { difficulty: 'easy', size: 7, count: 200 },
    { difficulty: 'medium', size: 10, count: 100 },
    { difficulty: 'hard', size: 12, count: 100 }
  ];
  
  const startTime = Date.now();
  
  for (const config of configs) {
    console.log(`\n生成 ${config.difficulty} 难度谜题 (${config.size}x${config.size})...`);
    
    const outputDir = path.join(__dirname, config.difficulty);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    let generated = 0;
    let attempted = 0;
    const maxAttempts = config.count * 10; // 最多尝试10倍数量
    
    while (generated < config.count && attempted < maxAttempts) {
      attempted++;
      
      const { grid, lights } = generatePuzzle(config.size, config.difficulty);
      const result = hasUniqueSolution(grid);
      
      if (result.unique) {
        generated++;
        const filename = `${config.difficulty}-${String(generated).padStart(4, '0')}.json`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify({
          id: generated,
          difficulty: config.difficulty,
          size: config.size,
          grid: grid,
          answer: result.solution,
          unique: true
        }, null, 2));
        
        if (generated % 10 === 0) {
          console.log(`  已生成: ${generated}/${config.count} (尝试: ${attempted})`);
        }
      }
    }
    
    const successRate = (generated / attempted * 100).toFixed(1);
    console.log(`  完成: ${generated}/${config.count} (成功率: ${successRate}%, 尝试: ${attempted})`);
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n总耗时: ${elapsed}秒`);
}

main().catch(console.error);
