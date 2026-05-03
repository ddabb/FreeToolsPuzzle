/**
 * 测试帐篷游戏生成器的成功率
 */

const CELL_EMPTY = 0;
const CELL_TREE = 1;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyGrid(size) {
  return Array(size).fill(null).map(() => Array(size).fill(CELL_EMPTY));
}

function generateSolution(size, minTrees, maxTrees) {
  const maxAttempts = 200;
  const targetTrees = minTrees + Math.floor(Math.random() * (maxTrees - minTrees + 1));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = createEmptyGrid(size);
    const cells = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        cells.push([r, c]);
      }
    }
    shuffle(cells);

    let treeCount = 0;
    for (const [r, c] of cells) {
      if (treeCount >= targetTrees) break;
      grid[r][c] = CELL_TREE;
      treeCount++;
    }

    if (treeCount < minTrees) continue;

    const treeTentMap = {};
    const tentMap = {};

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) {
          const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          shuffle(dirs);
          let placed = false;
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size &&
                grid[nr][nc] === CELL_EMPTY &&
                tentMap[`${nr},${nc}`] === undefined) {
              tentMap[`${nr},${nc}`] = true;
              treeTentMap[`${r},${c}`] = `${nr},${nc}`;
              placed = true;
              break;
            }
          }
          if (!placed) break;
        }
      }
    }

    let actualTreeCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === CELL_TREE) actualTreeCount++;
      }
    }
    if (Object.keys(treeTentMap).length !== actualTreeCount) continue;

    for (const tentPos in tentMap) {
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      let hasAdjacentTree = false;
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === CELL_TREE) {
          hasAdjacentTree = true;
          break;
        }
      }
      if (!hasAdjacentTree) {
        tentMap[tentPos] = false;
      }
    }

    let tentsAdjacent = false;
    for (const tentPos in tentMap) {
      if (!tentMap[tentPos]) continue;
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && tentMap[key]) {
          tentsAdjacent = true;
          break;
        }
      }
      if (tentsAdjacent) break;
    }
    if (tentsAdjacent) continue;

    let valid = true;
    for (const tentPos in tentMap) {
      if (!tentMap[tentPos]) continue;
      const [tr, tc] = tentPos.split(',').map(Number);
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      let adjacentTreeCount = 0;
      for (const [dr, dc] of dirs) {
        const nr = tr + dr, nc = tc + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === CELL_TREE) {
          adjacentTreeCount++;
        }
      }
      if (adjacentTreeCount !== 1) {
        valid = false;
        break;
      }
    }
    if (!valid) continue;

    return { grid, tents: tentMap, treeCount: actualTreeCount };
  }

  return null;
}

function countSolutions(grid, maxSolutions = 2) {
  const size = grid.length;
  const trees = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_TREE) {
        trees.push([r, c]);
      }
    }
  }

  const treeCount = trees.length;
  let solutionCount = 0;

  function tentsAdjacent(tentR, tentC, tentMap) {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = tentR + dr, nc = tentC + dc;
      if (tentMap[`${nr},${nc}`]) return true;
    }
    return false;
  }

  function solve(treeIndex, tentMap, treeToTent) {
    if (solutionCount >= maxSolutions) return;

    if (treeIndex === treeCount) {
      solutionCount++;
      return;
    }

    const [treeR, treeC] = trees[treeIndex];
    const treeKey = `${treeR},${treeC}`;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of dirs) {
      if (solutionCount >= maxSolutions) return;

      const tentR = treeR + dr;
      const tentC = treeC + dc;

      if (tentR < 0 || tentR >= size || tentC < 0 || tentC >= size) continue;
      if (grid[tentR][tentC] !== CELL_EMPTY) continue;
      if (tentMap[`${tentR},${tentC}`]) continue;
      if (treeToTent[treeKey]) continue;

      if (tentsAdjacent(tentR, tentC, tentMap)) continue;

      tentMap[`${tentR},${tentC}`] = true;
      treeToTent[treeKey] = `${tentR},${tentC}`;

      solve(treeIndex + 1, tentMap, treeToTent);

      delete tentMap[`${tentR},${tentC}`];
      delete treeToTent[treeKey];
    }
  }

  const tentMap = {};
  const treeToTent = {};

  solve(0, tentMap, treeToTent);

  return solutionCount;
}

function testGenerator(size, minTrees, maxTrees, iterations) {
  let generated = 0;
  let uniqueCount = 0;

  console.log(`测试 ${size}x${size}, 树数量 ${minTrees}-${maxTrees}, 迭代 ${iterations} 次`);

  for (let i = 0; i < iterations; i++) {
    const solution = generateSolution(size, minTrees, maxTrees);
    if (solution) {
      generated++;
      const solCount = countSolutions(solution.grid, 2);
      if (solCount === 1) {
        uniqueCount++;
      }
    }
  }

  console.log(`  生成成功: ${generated}/${iterations}`);
  console.log(`  唯一解: ${uniqueCount}/${generated} (${generated > 0 ? (uniqueCount/generated*100).toFixed(1) : 0}%)`);
  return { generated, uniqueCount };
}

console.log('=== 生成器成功率测试 ===\n');

testGenerator(6, 4, 8, 100);
testGenerator(8, 6, 12, 100);
testGenerator(10, 8, 16, 100);
testGenerator(10, 6, 16, 100);