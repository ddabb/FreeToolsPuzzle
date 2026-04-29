/**
 * Akari生成器 - Simon Tatham风格
 *
 * 核心策略：
 * 1. 从空板开始
 * 2. 逐步添加数字墙约束
 * 3. 每次添加后验证唯一解
 * 4. 如果无解则回退，如果多解则继续添加
 */

const fs = require('fs');
const path = require('path');

// 方向向量
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/**
 * Akari求解器 - 找到所有解（最多maxSolutions个）
 */
function solveAkari(grid, maxSolutions = 2) {
  const rows = grid.length;
  const cols = grid[0].length;

  // 找到所有空格位置
  const emptyCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 0) {
        emptyCells.push([r, c]);
      }
    }
  }

  const solutions = [];

  // 检查在位置(r,c)放灯塔是否有效
  function canPlaceLight(r, c, lights) {
    // 检查同行同列是否已有灯塔（中间无墙）
    for (let i = r - 1; i >= 0; i--) {
      if (grid[i][c] > 0) break; // 遇到墙，停止
      if (lights.has(`${i},${c}`)) return false; // 已有灯塔
    }
    for (let i = r + 1; i < rows; i++) {
      if (grid[i][c] > 0) break;
      if (lights.has(`${i},${c}`)) return false;
    }
    for (let j = c - 1; j >= 0; j--) {
      if (grid[r][j] > 0) break;
      if (lights.has(`${r},${j}`)) return false;
    }
    for (let j = c + 1; j < cols; j++) {
      if (grid[r][j] > 0) break;
      if (lights.has(`${r},${j}`)) return false;
    }
    return true;
  }

  // 检查当前部分解是否满足数字墙约束
  function checkWallConstraints(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > 0 && grid[r][c] <= 4) {
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (lights.has(`${nr},${nc}`)) count++;
            }
          }
          if (count > grid[r][c]) return false; // 超过约束
        }
      }
    }
    return true;
  }

  // 检查是否所有格子都被照亮
  function allLit(lights) {
    const lit = new Set();

    for (const key of lights) {
      const [r, c] = key.split(',').map(Number);

      // 照亮同行
      for (let j = c; j >= 0; j--) {
        if (grid[r][j] > 0) break;
        lit.add(`${r},${j}`);
      }
      for (let j = c; j < cols; j++) {
        if (grid[r][j] > 0) break;
        lit.add(`${r},${j}`);
      }

      // 照亮同列
      for (let i = r; i >= 0; i--) {
        if (grid[i][c] > 0) break;
        lit.add(`${i},${c}`);
      }
      for (let i = r; i < rows; i++) {
        if (grid[i][c] > 0) break;
        lit.add(`${i},${c}`);
      }
    }

    // 检查所有空格是否被照亮
    for (const [r, c] of emptyCells) {
      if (!lit.has(`${r},${c}`)) return false;
    }

    return true;
  }

  // 检查数字墙约束是否完全满足
  function checkWallConstraintsComplete(lights) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] > 0 && grid[r][c] <= 4) {
          let count = 0;
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (lights.has(`${nr},${nc}`)) count++;
            }
          }
          if (count !== grid[r][c]) return false;
        }
      }
    }
    return true;
  }

  // 回溯搜索
  function backtrack(index, lights) {
    if (solutions.length >= maxSolutions) return;

    // 检查数字墙约束
    if (!checkWallConstraints(lights)) return;

    // 如果所有空格都考虑完了
    if (index === emptyCells.length) {
      // 检查是否所有格子都被照亮
      if (!allLit(lights)) return;

      // 检查数字墙约束是否完全满足
      if (!checkWallConstraintsComplete(lights)) return;

      // 找到一个解
      solutions.push(Array.from(lights).map(key => {
        const [r, c] = key.split(',').map(Number);
        return [r, c];
      }));
      return;
    }

    const [r, c] = emptyCells[index];
    const key = `${r},${c}`;

    // 尝试不放灯塔
    backtrack(index + 1, lights);

    // 尝试放灯塔
    if (canPlaceLight(r, c, lights)) {
      lights.add(key);
      backtrack(index + 1, lights);
      lights.delete(key);
    }
  }

  backtrack(0, new Set());
  return solutions;
}

/**
 * 生成一个Akari谜题（Simon Tatham风格）
 */
function generatePuzzle(size, maxAttempts = 100) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. 从空板开始
    const grid = Array(size).fill(null).map(() => Array(size).fill(0));

    // 2. 随机添加一些墙（约20%的格子）
    const wallPositions = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (Math.random() < 0.2) {
          grid[r][c] = '#'; // 墙
          wallPositions.push([r, c]);
        }
      }
    }

    // 3. 对每个墙，随机决定是否添加数字约束
    for (const [r, c] of wallPositions) {
      if (Math.random() < 0.5) {
        // 计算周围有多少空格
        let emptyNeighbors = 0;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 0) {
            emptyNeighbors++;
          }
        }
        // 随机选择一个数字（不超过空格数）
        if (emptyNeighbors > 0) {
          const num = Math.floor(Math.random() * (emptyNeighbors + 1));
          grid[r][c] = num;
        }
      }
    }

    // 4. 验证唯一解
    const solutions = solveAkari(grid, 2);

    if (solutions.length === 1) {
      // 找到唯一解！
      return {
        size,
        grid,
        answer: solutions[0]
      };
    }
  }

  return null; // 失败
}

/**
 * 主函数
 */
function main() {
  console.log('开始生成Akari谜题（Simon Tatham风格）...\n');

  const difficulties = [
    { name: 'easy', size: 7, count: 10 },
    { name: 'medium', size: 10, count: 5 },
    { name: 'hard', size: 12, count: 3 }
  ];

  for (const diff of difficulties) {
    console.log(`生成 ${diff.name} 难度谜题 (${diff.size}x${diff.size})...`);

    const dir = path.join(__dirname, diff.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let success = 0;
    for (let i = 1; i <= diff.count; i++) {
      const puzzle = generatePuzzle(diff.size, 1000);

      if (puzzle) {
        const filename = `${diff.name}-${String(i).padStart(4, '0')}.json`;
        const filepath = path.join(dir, filename);

        // 转换grid格式（数字0用空格表示）
        const gridStr = puzzle.grid.map(row =>
          row.map(cell => {
            if (cell === 0) return ' ';
            if (cell === '#') return '#';
            return cell;
          })
        );

        fs.writeFileSync(filepath, JSON.stringify({
          size: puzzle.size,
          grid: gridStr,
          answer: puzzle.answer
        }, null, 2));

        success++;
        console.log(`  ✓ ${filename}`);
      } else {
        console.log(`  ✗ 第${i}题生成失败`);
      }
    }

    console.log(`完成: ${success}/${diff.count}\n`);
  }
}

main();
