/**
 * 帐篷游戏唯一解验证器
 * 检查所有生成的谜题是否真的只有唯一解
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = 'f:/SelfJob/freetoolspuzzle/data/tents';

const CELL_EMPTY = 0;
const CELL_TREE = 1;

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
  const emptyCells = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === CELL_EMPTY) {
        emptyCells.push([r, c]);
      }
    }
  }

  let solutionCount = 0;

  function isValidTent(tentR, tentC, tentMap, treeToTent) {
    if (tentMap[`${tentR},${tentC}`]) return false;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let adjacentTrees = 0;
    let treePos = null;

    for (const [dr, dc] of dirs) {
      const nr = tentR + dr, nc = tentC + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === CELL_TREE) {
        adjacentTrees++;
        treePos = `${nr},${nc}`;
      }
    }

    if (adjacentTrees !== 1) return false;

    if (treeToTent[treePos]) return false;

    return true;
  }

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

function verifyFile(filepath) {
  const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const grid = data.grid;
  const solutionCount = countSolutions(grid, 2);

  return {
    id: data.id,
    difficulty: data.difficulty,
    size: data.size,
    treeCount: data.treeCount,
    claimedUnique: data.unique,
    actualUnique: solutionCount === 1,
    solutionCount: solutionCount
  };
}

function verifyDifficulty(difficulty) {
  const dir = path.join(DATA_DIR, difficulty);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();

  console.log(`\n检查 ${difficulty} 难度 (共${files.length}个文件)...`);

  let wrongUnique = 0;
  let multiSolution = 0;
  const wrongFiles = [];

  for (let i = 0; i < files.length; i++) {
    const filepath = path.join(dir, files[i]);
    const result = verifyFile(filepath);

    if (!result.actualUnique) {
      multiSolution++;
      wrongUnique++;
      wrongFiles.push({ file: files[i], solutions: result.solutionCount });
    }

    if ((i + 1) % 100 === 0) {
      console.log(`  已检查 ${i + 1}/${files.length}, 发现多解: ${multiSolution}`);
    }
  }

  console.log(`  完成! 多解题目: ${multiSolution}/${files.length}`);

  if (wrongFiles.length > 0 && wrongFiles.length <= 10) {
    console.log(`  多解文件列表:`);
    wrongFiles.forEach(wf => {
      console.log(`    ${wf.file}: ${wf.solutions}个解`);
    });
  } else if (wrongFiles.length > 10) {
    console.log(`  前10个多解文件:`);
    wrongFiles.slice(0, 10).forEach(wf => {
      console.log(`    ${wf.file}: ${wf.solutions}个解`);
    });
  }

  return { total: files.length, multiSolution, wrongFiles };
}

function verifyAll() {
  console.log('=== 帐篷游戏唯一解验证 ===\n');

  const difficulties = ['easy', 'medium', 'hard'];
  const results = {};

  for (const difficulty of difficulties) {
    const dir = path.join(DATA_DIR, difficulty);
    if (fs.existsSync(dir)) {
      results[difficulty] = verifyDifficulty(difficulty);
    }
  }

  console.log('\n=== 总结 ===');
  let totalPuzzles = 0;
  let totalMultiSolution = 0;

  for (const [difficulty, result] of Object.entries(results)) {
    console.log(`${difficulty}: ${result.multiSolution}/${result.total} 题目有多解`);
    totalPuzzles += result.total;
    totalMultiSolution += result.multiSolution;
  }

  console.log(`\n总计: ${totalMultiSolution}/${totalPuzzles} 题目有多解`);

  if (totalMultiSolution > 0) {
    console.log('\n生成的多解文件列表:');
    for (const [difficulty, result] of Object.entries(results)) {
      if (result.wrongFiles.length > 0) {
        console.log(`\n${difficulty}:`);
        result.wrongFiles.forEach(wf => {
          console.log(`  ${wf.file}`);
        });
      }
    }
  }
}

verifyAll();