const fs = require('fs');
const path = require('path');

function isAdj(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2&&c1===c2); }

for (const diff of ['easy', 'medium', 'hard']) {
  const dir = 'F:/SelfJob/FreeToolsPuzzle/data/tents/' + diff;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  let ok = 0, treeBad = 0, tentBad = 0, tentAdj = 0;

  for (const fn of files.slice(0, 50)) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, fn), 'utf8'));
    const trees = [];
    for (let r = 0; r < d.size; r++) for (let c = 0; c < d.size; c++) if (d.grid[r][c] === 1) trees.push([r, c]);
    const tentPos = Object.keys(d.tents).map(k => k.split(',').map(Number));

    let thisOk = true;

    // 树视角：每树恰好1帐篷
    for (const tree of trees) {
      const adj = tentPos.filter(t => isAdj(tree[0], tree[1], t[0], t[1]));
      if (adj.length !== 1) { treeBad++; thisOk = false; }
    }

    // 帐篷视角：每帐篷恰好1树
    for (const tent of tentPos) {
      const adj = trees.filter(t => isAdj(tent[0], tent[1], t[0], t[1]));
      if (adj.length !== 1) { tentBad++; thisOk = false; }
    }

    // 帐篷不相邻
    for (let i = 0; i < tentPos.length; i++) {
      for (let j = i + 1; j < tentPos.length; j++) {
        if (isAdj(tentPos[i][0], tentPos[i][1], tentPos[j][0], tentPos[j][1])) { tentAdj++; thisOk = false; }
      }
    }

    if (thisOk) ok++;
  }

  console.log(diff + ' (50题): 全通过=' + ok + ' 树视角违反=' + treeBad + ' 帐篷视角违反=' + tentBad + ' 帐篷相邻=' + tentAdj);
}
