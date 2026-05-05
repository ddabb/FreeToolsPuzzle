const SIZES = { easy: 6, medium: 8, hard: 10 };
const TREE_COUNTS = { easy: [3, 5], medium: [4, 6], hard: [5, 8] };

function getNeighbors(r, c, size) {
  return [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc]) => [r+dr,c+dc]).filter(([nr,nc]) => nr>=0 && nr<size && nc>=0 && nc<size);
}
function isAdjacent(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2 && c1===c2); }
function hasAdjacentTent(newTent, tents) { for (const t of tents) if (isAdjacent(newTent[0],newTent[1],t[0],t[1])) return true; return false; }

function getValidTentSpots(treeR, treeC, grid, size, tents, trees) {
  return getNeighbors(treeR, treeC, size).filter(([r, c]) => {
    if (grid[r][c] !== 0) return false;
    if (hasAdjacentTent([r, c], tents)) return false;
    for (const [tr, tc] of trees) {
      if (tr === treeR && tc === treeC) continue;
      if (isAdjacent(r, c, tr, tc)) return false;
    }
    return true;
  });
}

function isNearExistingTent(r, c, tents) {
  for (var i=0; i<tents.length; i++) if (isAdjacent(r,c,tents[i][0],tents[i][1])) return true;
  return false;
}

function buildSolution(size, targetTrees) {
  const grid = Array(size).fill(null).map(() => Array(size).fill(0));
  const trees = [], tents = [];
  for (let t1 = 0; t1 < 200; t1++) {
    const r1 = Math.floor(Math.random()*size), c1 = Math.floor(Math.random()*size);
    if (isNearExistingTent(r1, c1, tents)) continue;
    grid[r1][c1] = 1; trees.push([r1,c1]);
    const spots1 = getValidTentSpots(r1,c1,grid,size,tents,trees);
    if (!spots1.length) { grid[r1][c1]=0; trees.pop(); continue; }
    const [tr1,tc1] = spots1[Math.floor(Math.random()*spots1.length)];
    tents.push([tr1,tc1]);
    const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    const adj = dirs.map(([dr,dc])=>[r1+dr,c1+dc]).filter(([r,c])=>r>=0&&r<size&&c>=0&&c<size&&grid[r][c]===0);
    if (!adj.length) { grid[r1][c1]=0; tents.pop(); trees.pop(); continue; }
    const [r2,c2] = adj[Math.floor(Math.random()*adj.length)];
    grid[r2][c2]=1; trees.push([r2,c2]);
    const spots2 = getValidTentSpots(r2,c2,grid,size,tents,trees);
    if (!spots2.length) { grid[r2][c2]=0; trees.pop(); tents.pop(); grid[r1][c1]=0; trees.pop(); continue; }
    const [tr2,tc2] = spots2[Math.floor(Math.random()*spots2.length)];
    tents.push([tr2,tc2]); break;
  }
  if (trees.length < 2) return null;
  for (let att = 0; att < 1000 && trees.length < targetTrees; att++) {
    const cands = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 0) continue;
      let md = Infinity; for (const [tr,tc] of trees) { const d = Math.abs(r-tr)+Math.abs(c-tc); if (d<md) md=d; }
      cands.push([r,c,md]);
    }
    if (!cands.length) break; cands.sort((a,b) => a[2]-b[2]);
    const topN = Math.min(8, cands.length);
    const [sr,sc] = cands[Math.floor(Math.random()*topN)];
    if (isNearExistingTent(sr, sc, tents)) continue;
    grid[sr][sc] = 1; trees.push([sr,sc]);
    const spots = getValidTentSpots(sr,sc,grid,size,tents,trees);
    if (!spots.length) { grid[sr][sc]=0; trees.pop(); continue; }
    const [tr,tc] = spots[Math.floor(Math.random()*spots.length)];
    tents.push([tr,tc]);
  }
  return trees.length >= 4 ? {grid,trees,tents} : null;
}

function countSolutions(grid, size, maxCount) {
  maxCount = maxCount || 2;
  const trees = []; for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (grid[r][c]===1) trees.push([r,c]);
  if (!trees.length) return {count:0};
  const n = trees.length;
  const opts = trees.map(([tr,tc]) => getNeighbors(tr,tc,size).filter(([r,c]) => grid[r][c]!==1));
  if (opts.some(function(p){return !p.length;})) return {count:0};
  const asgn = Array(n).fill(null); let cnt = 0;
  function bt(idx) {
    if (idx===n) { cnt++; return cnt>=maxCount; }
    for (var k=0; k<opts[idx].length; k++) {
      var tr=opts[idx][k][0], tc=opts[idx][k][1];
      var occ=false; for (var j=0;j<idx;j++) if (asgn[j][0]===tr && asgn[j][1]===tc) {occ=true;break;}
      if (occ) continue;
      var adj=false; for (var j2=0;j2<idx;j2++) if (isAdjacent(tr,tc,asgn[j2][0],asgn[j2][1])) {adj=true;break;}
      if (adj) continue;
      asgn[idx]=[tr,tc]; if (bt(idx+1)) return true;
    }
    return false;
  }
  bt(0); return {count:cnt};
}

function validateSolution(trees, tents) {
  for (var i=0; i<trees.length; i++) if (!isAdjacent(trees[i][0],trees[i][1],tents[i][0],tents[i][1])) return false;
  for (var i=0; i<tents.length; i++) {
    for (var j=i+1; j<tents.length; j++) if (isAdjacent(tents[i][0],tents[i][1],tents[j][0],tents[j][1])) return false;
    var ac=0; for (var k=0; k<trees.length; k++) if (isAdjacent(tents[i][0],tents[i][1],trees[k][0],trees[k][1])) ac++;
    if (ac!==1) return false;
  }
  return true;
}

// Test each difficulty
var diffs = ['easy','medium','hard'];
for (var di=0; di<diffs.length; di++) {
  var diff = diffs[di];
  var ok=0, fail=0, notValid=0, notUniq=0;
  var t0 = Date.now();
  for (var i=0; i<50; i++) {
    var tc = TREE_COUNTS[diff][0] + Math.floor(Math.random()*(TREE_COUNTS[diff][1]-TREE_COUNTS[diff][0]+1));
    var sol = buildSolution(SIZES[diff], tc);
    if (!sol) { fail++; continue; }
    if (!validateSolution(sol.trees, sol.tents)) { notValid++; continue; }
    var r = countSolutions(sol.grid, SIZES[diff], 2);
    if (r.count===1) ok++; else notUniq++;
  }
  console.log(diff + ': ok=' + ok + ' fail=' + fail + ' notValid=' + notValid + ' notUnique=' + notUniq + ' (' + ((Date.now()-t0)/1000).toFixed(1) + 's)');
}
