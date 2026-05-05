const fs = require('fs');
const path = require('path');

function isAdj(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

const dir = 'F:/SelfJob/FreeToolsPuzzle/data/tents/hard';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).slice(0, 20);

let multiTreeTents = 0;
let multiTentTrees = 0;
let badTrees = [];
let badTents = [];

for (const file of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const trees = [];
  for (let r = 0; r < d.size; r++) {
    for (let c = 0; c < d.size; c++) {
      if (d.grid[r][c] === 1) trees.push([r, c]);
    }
  }
  const tentPos = Object.keys(d.tents).map(k => k.split(',').map(Number));

  // 每个树相邻几个帐篷（必须恰好1个）
  for (const tree of trees) {
    const adj = tentPos.filter(t => isAdj(tree[0], tree[1], t[0], t[1]));
    if (adj.length !== 1) {
      multiTentTrees++;
      if (badTrees.length < 5) badTrees.push(file + ' tree(' + tree + ')=' + adj.length + ' tents');
    }
  }

  // 每个帐篷相邻几棵树（必须恰好1个）
  for (const tent of tentPos) {
    const adj = trees.filter(t => isAdj(t[0], t[1], tent[0], tent[1]));
    if (adj.length !== 1) {
      multiTreeTents++;
      if (badTents.length < 5) badTents.push(file + ' tent(' + tent + ')=' + adj.length + ' trees');
    }
  }
}

console.log('样本文件数:', files.length);
console.log('树视角 - 帐篷数!=1:', multiTentTrees, '个');
console.log('帐篷视角 - 树数!=1:', multiTreeTents, '个');
if (badTrees.length) console.log('问题树示例:', badTrees);
if (badTents.length) console.log('问题帐篷示例:', badTents);