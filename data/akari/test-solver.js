// 测试求解器
const grid = [
  [1, 0, 0],
  [0, 0, 0],
  [0, 0, 1]
];

console.log('测试网格:');
console.log(grid);

// 简单的求解器
function solve(grid) {
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
  
  console.log('空格数量:', emptyCells.length);
  console.log('空格:', emptyCells);
  
  let solutionCount = 0;
  
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
    if (index === emptyCells.length) {
      if (allCellsLit(lights) && checkNumberConstraints(lights)) {
        solutionCount++;
        console.log('找到解:', lights);
      }
      return;
    }
    
    const cell = emptyCells[index];
    
    backtrack(index + 1, lights);
    
    if (isValidPlacement(lights, cell.r, cell.c)) {
      lights.push(cell);
      backtrack(index + 1, lights);
      lights.pop();
    }
  }
  
  backtrack(0, []);
  
  return solutionCount;
}

const count = solve(grid);
console.log('解的数量:', count);
