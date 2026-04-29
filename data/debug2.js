/**
 * 调试数回验证器
 */

function hasUniqueSolution(size, grid) {
  const edges = {
    horizontal: Array.from({ length: size + 1 }, () => Array(size).fill(0)),
    vertical: Array.from({ length: size }, () => Array(size + 1).fill(0))
  };

  let solutionCount = 0;
  const maxSolutions = 2;

  function isValidPartialDebug(msg) {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cell = grid[i][j];
        let cnt = 0;
        if (edges.horizontal[i][j] === 1) cnt++;
        if (edges.horizontal[i + 1][j] === 1) cnt++;
        if (edges.vertical[i][j] === 1) cnt++;
        if (edges.vertical[i][j + 1] === 1) cnt++;
        if (cnt > cell) {
          console.log(msg, 'Cell', i, j, 'cnt', cnt, 'cell', cell, 'INVALID');
          return false;
        }
      }
    }
    return true;
  }

  function backtrack(depth) {
    if (solutionCount >= maxSolutions) return;
    if (depth > 5) return;

    let found = false;
    let bestI = 0, bestJ = 0, bestType = 'horizontal';
    let minOptions = 3;

    for (let i = 0; i <= size; i++) {
      for (let j = 0; j < size; j++) {
        if (edges.horizontal[i][j] === 0) {
          const opts = getOptions('horizontal', i, j);
          if (opts.length > 0 && opts.length < minOptions) {
            minOptions = opts.length;
            bestI = i;
            bestJ = j;
            bestType = 'horizontal';
            found = true;
          }
        }
      }
    }

    for (let i = 0; i < size; i++) {
      for (let j = 0; j <= size; j++) {
        if (edges.vertical[i][j] === 0) {
          const opts = getOptions('vertical', i, j);
          if (opts.length > 0 && opts.length < minOptions) {
            minOptions = opts.length;
            bestI = i;
            bestJ = j;
            bestType = 'vertical';
            found = true;
          }
        }
      }
    }

    if (!found) {
      console.log('No more edges to set, checking...');
      if (isValidLoop()) {
        solutionCount++;
        console.log('Found solution #', solutionCount);
      }
      return;
    }

    const opts = getOptions(bestType, bestI, bestJ);
    console.log(' '.repeat(depth), 'Setting', bestType, bestI, bestJ, 'options:', opts);
    for (const opt of opts) {
      edges[bestType][bestI][bestJ] = opt;
      backtrack(depth + 1);
      edges[bestType][bestI][bestJ] = 0;
      if (solutionCount >= maxSolutions) return;
    }
  }

  function getOptions(type, i, j) {
    const result = [];
    edges[type][i][j] = 1;
    if (isValidPartial()) result.push(1);
    edges[type][i][j] = 2;
    if (isValidPartial()) result.push(2);
    edges[type][i][j] = 0;
    return result;
  }

  function isValidPartial() {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cell = grid[i][j];
        let cnt = 0;
        if (edges.horizontal[i][j] === 1) cnt++;
        if (edges.horizontal[i + 1][j] === 1) cnt++;
        if (edges.vertical[i][j] === 1) cnt++;
        if (edges.vertical[i][j + 1] === 1) cnt++;
        if (cnt > cell) return false;
      }
    }
    return true;
  }

  function isValidLoop() {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const cell = grid[i][j];
        let cnt = 0;
        if (edges.horizontal[i][j] === 1) cnt++;
        if (edges.horizontal[i + 1][j] === 1) cnt++;
        if (edges.vertical[i][j] === 1) cnt++;
        if (edges.vertical[i][j + 1] === 1) cnt++;
        if (cnt !== cell) return false;
      }
    }
    return true;
  }

  backtrack(0);
  return solutionCount === 1;
}

// Test
console.log('Testing grid[0][0] = 1:');
const grid1 = [
  [1, 0, 0],
  [0, 0, 0],
  [0, 0, 0]
];
console.log('Result:', hasUniqueSolution(3, grid1));

console.log('\nTesting all zeros:');
const grid0 = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0]
];
console.log('Result:', hasUniqueSolution(3, grid0));