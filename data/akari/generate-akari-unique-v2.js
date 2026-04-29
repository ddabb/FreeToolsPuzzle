/**
 * Akari谜题生成器 - 唯一解版本v2
 * 策略：先生成解，再添加约束，逐步验证唯一性
 */

const fs = require('fs');
const path = require('path');

// 验证唯一解的求解器
function hasUniqueSolution(grid) {
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
    if (solutionCount >= 2) return;
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
    if (solutionCount >= 2) return;
    
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

// 生成一个有唯一解的谜题
function generateUniquePuzzle(size) {
  // 初始化空网格
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 随机生成一个灯塔布局（作为解）
  const lights = [];
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells.push({ r, c });
    }
  }
  
  // 随机打乱
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  
  // 放置灯塔，确保不冲突
  for (const cell of cells) {
    if (Math.random() < 0.3) {
      let conflict = false;
      for (const light of lights) {
        if (light.r === cell.r || light.c === cell.c) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        lights.push(cell);
      }
    }
  }
  
  // 确保所有格子被照亮
  function isLit(r, c) {
    for (const light of lights) {
      if (light.r === r && light.c === c) return true;
      if (light.r === r || light.c === c) return true;
    }
    return false;
  }
  
  // 添加灯塔确保所有格子被照亮
  for (const cell of cells) {
    if (!isLit(cell.r, cell.c)) {
      let conflict = false;
      for (const light of lights) {
        if (light.r === cell.r || light.c === cell.c) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        lights.push(cell);
      }
    }
  }
  
  // 现在添加数字墙来约束解
  const wallPositions = [];
  const wallCount = Math.floor(size * size * 0.1); // 10%的墙
  
  // 随机选择墙的位置
  const availablePositions = cells.filter(c => !lights.some(l => l.r === c.r && l.c === c.c));
  for (let i = availablePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
  }
  
  for (let i = 0; i < Math.min(wallCount, availablePositions.length); i++) {
    wallPositions.push(availablePositions[i]);
  }
  
  // 设置数字墙
  for (const wall of wallPositions) {
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
  
  // 验证唯一性
  const result = hasUniqueSolution(grid);
  
  if (result.unique) {
    return { grid, lights: result.solution, unique: true };
  }
  
  return null;
}

// 主函数
async function main() {
  console.log('开始生成Akari谜题（唯一解验证v2）...\n');
  
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
    const maxAttempts = config.count * 20; // 最多尝试20倍数量
    
    while (generated < config.count && attempted < maxAttempts) {
      attempted++;
      
      const puzzle = generateUniquePuzzle(config.size);
      
      if (puzzle) {
        generated++;
        const filename = `${config.difficulty}-${String(generated).padStart(4, '0')}.json`;
        const filepath = path.join(outputDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify({
          id: generated,
          difficulty: config.difficulty,
          size: config.size,
          grid: puzzle.grid,
          answer: puzzle.lights,
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
