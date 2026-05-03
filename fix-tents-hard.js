/**
 * 修复帐篷游戏hard难度中有多解的题目
 * 重新生成完整谜题（新的树布局），只确保唯一解
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = 'f:/SelfJob/freetoolspuzzle/data/tents/hard';

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
  const maxAttempts = 500;
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

const multiSolutionFiles = [
  'hard-0002.json', 'hard-0016.json', 'hard-0019.json', 'hard-0036.json', 'hard-0077.json',
  'hard-0094.json', 'hard-0127.json', 'hard-0133.json', 'hard-0166.json', 'hard-0171.json',
  'hard-0207.json', 'hard-0243.json', 'hard-0253.json', 'hard-0261.json', 'hard-0289.json',
  'hard-0304.json', 'hard-0308.json', 'hard-0316.json', 'hard-0347.json', 'hard-0363.json',
  'hard-0366.json', 'hard-0371.json', 'hard-0394.json', 'hard-0419.json', 'hard-0424.json',
  'hard-0431.json', 'hard-0453.json', 'hard-0457.json', 'hard-0460.json', 'hard-0509.json',
  'hard-0511.json', 'hard-0516.json', 'hard-0560.json', 'hard-0565.json', 'hard-0585.json',
  'hard-0587.json', 'hard-0593.json', 'hard-0638.json', 'hard-0656.json', 'hard-0665.json',
  'hard-0680.json', 'hard-0712.json', 'hard-0767.json', 'hard-0775.json', 'hard-0780.json',
  'hard-0790.json', 'hard-0800.json', 'hard-0825.json', 'hard-0832.json', 'hard-0906.json',
  'hard-0911.json', 'hard-0916.json', 'hard-0930.json', 'hard-0932.json', 'hard-0949.json',
  'hard-0976.json', 'hard-0985.json', 'hard-0998.json'
];

console.log(`开始修复 ${multiSolutionFiles.length} 个有多解的hard题目...\n`);

let fixed = 0;
let failed = 0;

for (const filename of multiSolutionFiles) {
  const filepath = path.join(DATA_DIR, filename);
  const oldData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

  let newPuzzle = null;
  for (let attempt = 0; attempt < 500; attempt++) {
    const solution = generateSolution(10, 6, 16);
    if (!solution) continue;

    const solutionCount = countSolutions(solution.grid, 2);
    if (solutionCount === 1) {
      newPuzzle = solution;
      break;
    }
  }

  if (newPuzzle) {
    const data = {
      id: oldData.id,
      difficulty: 'hard',
      size: 10,
      grid: newPuzzle.grid,
      tents: newPuzzle.tents,
      treeCount: newPuzzle.treeCount,
      unique: true,
      seed: Math.floor(Math.random() * 1000000)
    };

    fs.writeFileSync(filepath, JSON.stringify(data));
    fixed++;
    console.log(`修复: ${filename} (树=${newPuzzle.treeCount}棵)`);
  } else {
    failed++;
    console.log(`失败: ${filename}`);
  }
}

console.log(`\n修复完成! 成功: ${fixed}, 失败: ${failed}`);