const fs = require('fs');

function isAdj(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

function countSolutions(grid, size, maxCount = 2) {
  const trees = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) trees.push([r, c]);
    }
  }
  if (trees.length === 0) return { count: 0 };
  const tentPlacements = trees.map(([tr, tc]) =>
    [[-1,0],[1,0],[0,-1],[0,1]]
      .map(([dr,dc]) => [tr+dr, tc+dc])
      .filter(([r,c]) => r>=0 && r<size && c>=0 && c<size && grid[r][c] === 0)
  );
  if (tentPlacements.some(p => p.length === 0)) return { count: 0 };

  const n = trees.length;
  const indices = Array(n).fill(0);
  let count = 0, firstSol = null;

  while (true) {
    const tents = indices.map((idx, ti) => tentPlacements[ti][idx]);
    const seen = new Set(tents.map(t => t[0] + ',' + t[1]));
    if (seen.size < n) {
      indices[0]++;
      for (let i = 0; i < n - 1; i++) {
        if (indices[i] >= tentPlacements[i].length) { indices[i] = 0; indices[i+1]++; }
      }
      continue;
    }

    // bipartite matching
    const adjMat = Array.from({length: n}, () => Array(n).fill(false));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (isAdj(trees[i][0], trees[i][1], tents[j][0], tents[j][1])) adjMat[i][j] = true;
      }
    }

    const match = Array(n).fill(-1);
    function bpm(k, vis) {
      for (let j = 0; j < n; j++) {
        if (!vis[j] && adjMat[k][j]) {
          vis[j] = true;
          if (match[j] < 0 || bpm(match[j], vis)) { match[j] = k; return true; }
        }
      }
      return false;
    }

    let ok = true;
    for (let i = 0; i < n; i++) {
      const v = Array(n).fill(false);
      if (!bpm(i, v)) { ok = false; break; }
    }

    if (ok) {
      count++;
      if (count === 1) firstSol = tents;
      if (count >= maxCount) break;
    }

    let i = 0;
    while (i < n && indices[i] >= tentPlacements[i].length - 1) { indices[i] = 0; i++; }
    if (i >= n) break;
    indices[i]++;
  }

  return { count, solution: firstSol };
}

const d = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/tents/hard/hard-0001.json', 'utf8'));
const result = countSolutions(d.grid, d.size, 1);
console.log('解的数量:', result.count);
if (result.solution) {
  console.log('解的帐篷位置:', JSON.stringify(result.solution));
  for (const tent of result.solution) {
    const adjTrees = [];
    for (let r = 0; r < d.size; r++) {
      for (let c = 0; c < d.size; c++) {
        if (d.grid[r][c] === 1 && isAdj(r, c, tent[0], tent[1])) adjTrees.push([r, c]);
      }
    }
    console.log('  帐篷(' + tent + ')相邻树:', adjTrees.length + '个', JSON.stringify(adjTrees));
  }
}