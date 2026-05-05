const fs = require('fs');

function isAdj(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
}

const d = JSON.parse(fs.readFileSync('F:/SelfJob/FreeToolsPuzzle/data/tents/hard/hard-0001.json', 'utf8'));
const tents = Object.keys(d.tents).map(k => k.split(',').map(Number));

// Check 1: Tents adjacent to each other (violates rule)
let tentAdjCount = 0;
for (let i = 0; i < tents.length; i++) {
  for (let j = i + 1; j < tents.length; j++) {
    if (isAdj(tents[i][0], tents[i][1], tents[j][0], tents[j][1])) {
      tentAdjCount++;
      console.log('帐篷相邻: ' + tents[i] + ' <-> ' + tents[j]);
    }
  }
}
console.log('帐篷之间相邻对数:', tentAdjCount);

// Check 2: Each tent adjacent to exactly 1 tree
let multiTreeTents = 0;
for (const tent of tents) {
  const adjTrees = [];
  for (let r = 0; r < d.size; r++) {
    for (let c = 0; c < d.size; c++) {
      if (d.grid[r][c] === 1 && isAdj(r, c, tent[0], tent[1])) adjTrees.push([r, c]);
    }
  }
  if (adjTrees.length !== 1) {
    multiTreeTents++;
    console.log('帐篷' + tent + '相邻树数=' + adjTrees.length + ': ' + JSON.stringify(adjTrees));
  }
}
console.log('帐篷视角-多树相邻数:', multiTreeTents);

// Check 3: Each tree adjacent to exactly 1 tent
let trees = [];
for (let r = 0; r < d.size; r++) for (let c = 0; c < d.size; c++) if (d.grid[r][c] === 1) trees.push([r, c]);
let multiTentTrees = 0;
for (const tree of trees) {
  const adj = tents.filter(t => isAdj(tree[0], tree[1], t[0], t[1]));
  if (adj.length !== 1) {
    multiTentTrees++;
    console.log('树' + tree + '相邻帐篷数=' + adj.length + ': ' + JSON.stringify(adj));
  }
}
console.log('树视角-多帐篷相邻数:', multiTentTrees);
console.log('\n结论: 标准帐篷规则要求帐篷之间不能相邻（含对角），且每个帐篷只能相邻1棵树');
console.log('当前 hard 数据违反这些规则');