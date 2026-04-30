/**
 * Akari谜题快速生成器 - 修复版
 * 策略：先放置黑格/数字墙，再求解灯塔布局
 * 确保数字墙约束正确
 */

const fs = require('fs');
const path = require('path');

// 求解器：找到所有灯塔位置
function solve(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  
  // 收集所有空格
  const emptyCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) {
        emptyCells.push({ r, c });
      }
    }
  }
  
  // 检查灯塔是否有效放置
  function isValidPlacement(lights, r, c) {
    for (const light of lights) {
      if (light.r === r || light.c === c) {
        if (light.r === r) {
          const minC = Math.min(light.c, c);
          const maxC = Math.max(light.c, c);
          for (let cc = minC + 1; cc < maxC; cc++) {
            if (grid[r][cc] >= 1) return true;
          }
          return false;
        } else {
          const minR = Math.min(light.r, r);
          const maxR = Math.max(light.r, r);
          for (let rr = minR + 1; rr < maxR; rr++) {
            if (grid[rr][c] >= 1) return true;
          }
          return false;
        }
      }
    }
    return true;
  }
  
  // 检查所有格子是否被照亮
  function allCellsLit(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 0) {
          let lit = false;
          for (const light of lights) {
            if (light.r === r && light.c === c) { lit = true; break; }
            if (light.r === r) {
              const minC = Math.min(light.c, c);
              const maxC = Math.max(light.c, c);
              let blocked = false;
              for (let cc = minC + 1; cc < maxC; cc++) {
                if (grid[r][cc] >= 1) { blocked = true; break; }
              }
              if (!blocked) { lit = true; break; }
            }
            if (light.c === c) {
              const minR = Math.min(light.r, r);
              const maxR = Math.max(light.r, r);
              let blocked = false;
              for (let rr = minR + 1; rr < maxR; rr++) {
                if (grid[rr][c] >= 1) { blocked = true; break; }
              }
              if (!blocked) { lit = true; break; }
            }
          }
          if (!lit) return false;
        }
      }
    }
    return true;
  }
  
  // 检查数字墙约束
  function checkNumberConstraints(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] >= 2 && grid[r][c] <= 6) {
          const expectedCount = grid[r][c] - 2;
          let actualCount = 0;
          const neighbors = [[r-1,c], [r+1,c], [r,c-1], [r,c+1]];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (lights.some(l => l.r === nr && l.c === nc)) actualCount++;
            }
          }
          if (actualCount !== expectedCount) return false;
        }
      }
    }
    return true;
  }
  
  let solutionCount = 0;
  let firstSolution = null;
  
  function backtrack(index, lights) {
    if (solutionCount >= 2) return;
    
    if (index === emptyCells.length) {
      if (allCellsLit(lights) && checkNumberConstraints(lights)) {
        solutionCount++;
        if (!firstSolution) firstSolution = [...lights];
      }
      return;
    }
    
    const cell = emptyCells[index];
    
    // 不放灯塔
    backtrack(index + 1, lights);
    if (solutionCount >= 2) return;
    
    // 放灯塔
    if (isValidPlacement(lights, cell.r, cell.c)) {
      lights.push(cell);
      backtrack(index + 1, lights);
      lights.pop();
    }
  }
  
  backtrack(0, []);
  
  return { count: solutionCount, solution: firstSolution };
}

// 生成谜题
function generatePuzzle(size, difficulty) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  
  // 先随机放置黑格
  const wallRate = difficulty === 'easy' ? 0.1 : difficulty === 'medium' ? 0.15 : 0.2;
  const numWallRate = 0.6; // 黑格中数字墙的比例
  
  const walls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < wallRate) {
        walls.push({ r, c });
      }
    }
  }
  
  // 设置黑格
  for (const wall of walls) {
    grid[wall.r][wall.c] = 1; // 先设为普通黑格
  }
  
  // 求解，找到灯塔布局
  const result = solve(grid);
  if (!result.solution) return null;
  
  // 根据灯塔布局设置数字墙
  for (const wall of walls) {
    if (Math.random() < numWallRate) {
      let count = 0;
      const neighbors = [[wall.r-1, wall.c], [wall.r+1, wall.c], [wall.r, wall.c-1], [wall.r, wall.c+1]];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (result.solution.some(l => l.r === nr && l.c === nc)) count++;
        }
      }
      grid[wall.r][wall.c] = count + 2; // 修复：存储 count+2
    }
  }
  
  // 验证唯一性
  const verify = solve(grid);
  if (verify.count !== 1) return null;
  
  return { grid, lights: verify.solution };
}

async function main() {
  console.log('Akari谜题生成器（修复版）\n');
  
  const configs = [
    { difficulty: 'easy', size: 7, count: 1000 },
    { difficulty: 'medium', size: 10, count: 1000 },
    { difficulty: 'hard', size: 12, count: 1000 }
  ];
  
  for (const config of configs) {
    console.log(`生成 ${config.difficulty} (${config.size}x${config.size})...`);
    
    const dir = path.join(__dirname, config.difficulty);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    let generated = 0;
    let attempts = 0;
    
    while (generated < config.count && attempts < config.count * 20) {
      attempts++;
      const puzzle = generatePuzzle(config.size, config.difficulty);
      
      if (puzzle) {
        generated++;
        const file = path.join(dir, `${config.difficulty}-${String(generated).padStart(4, '0')}.json`);
        fs.writeFileSync(file, JSON.stringify({
          id: generated,
          difficulty: config.difficulty,
          size: config.size,
          grid: puzzle.grid,
          answer: puzzle.lights.map(l => [l.r, l.c])
        }, null, 2));
        
        if (generated % 100 === 0) {
          console.log(`  ${generated}/${config.count}`);
        }
      }
    }
    
    console.log(`  完成: ${generated}/${config.count} (尝试: ${attempts})\n`);
  }
  
  console.log('完成！');
}

main().catch(console.error);
