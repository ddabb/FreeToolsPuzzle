// Tents v14b - 树-帐篷成对放置
// 每次放一对：先选树位→选帐篷位→检查约束
// 约束：1)帐篷不与其他树相邻 2)树不与其他帐篷相邻 3)帐篷之间不相邻

var SIZES = { easy: 6, medium: 8, hard: 10 };
var TREE_COUNTS = { easy: [3, 5], medium: [4, 6], hard: [5, 8] };

function isAdj(r1, c1, r2, c2) { return Math.abs(r1-r2)<=1 && Math.abs(c1-c2)<=1 && !(r1===r2 && c1===c2); }

function buildSolution(size, targetTrees) {
  var grid = [];
  for (var r = 0; r < size; r++) { grid[r] = []; for (var c = 0; c < size; c++) grid[r][c] = 0; }
  var trees = [], tents = [];

  for (var pair = 0; pair < targetTrees; pair++) {
    var placed = false;
    // 尝试多次放置这对树+帐篷
    for (var attempt = 0; attempt < 500; attempt++) {
      // 随机选一个位置作为树
      var sr = Math.floor(Math.random() * size);
      var sc = Math.floor(Math.random() * size);
      if (grid[sr][sc] !== 0) continue;

      // 约束1: 树不能紧邻已有帐篷（否则帐篷就属于两棵树）
      var treeNearTent = false;
      for (var ti = 0; ti < tents.length; ti++) {
        if (isAdj(sr, sc, tents[ti][0], tents[ti][1])) { treeNearTent = true; break; }
      }
      if (treeNearTent) continue;

      // 临时放树
      grid[sr][sc] = 1;

      // 找这个树的合法帐篷位
      var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      var spots = [];
      for (var di = 0; di < dirs.length; di++) {
        var tr = sr + dirs[di][0], tc = sc + dirs[di][1];
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue;
        if (grid[tr][tc] !== 0) continue;

        // 约束2: 帐篷不能紧邻其他树
        var tentNearOtherTree = false;
        for (var tti = 0; tti < trees.length; tti++) {
          if (isAdj(tr, tc, trees[tti][0], trees[tti][1])) { tentNearOtherTree = true; break; }
        }
        if (tentNearOtherTree) continue;

        // 约束3: 帐篷不能与已有帐篷相邻（含对角）
        var tentNearTent = false;
        for (var tii = 0; tii < tents.length; tii++) {
          if (isAdj(tr, tc, tents[tii][0], tents[tii][1])) { tentNearTent = true; break; }
        }
        if (tentNearTent) continue;

        spots.push([tr, tc]);
      }

      if (spots.length === 0) {
        // 没有合法帐篷位，回退树
        grid[sr][sc] = 0;
        continue;
      }

      // 随机选一个合法帐篷位
      var chosen = spots[Math.floor(Math.random() * spots.length)];
      trees.push([sr, sc]);
      tents.push(chosen);
      placed = true;
      break;
    }

    if (!placed) {
      // 无法放更多对，返回已有的
      break;
    }
  }

  if (trees.length < 3) return null;
  return { grid: grid, trees: trees, tents: tents };
}

function countSolutions(grid, size, maxCount) {
  maxCount = maxCount || 2;
  var trees = [];
  for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (grid[r][c] === 1) trees.push([r, c]);
  if (!trees.length) return { count: 0 };
  var n = trees.length;
  var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  var opts = [];
  for (var i = 0; i < n; i++) {
    var o = [];
    for (var di = 0; di < 4; di++) {
      var nr = trees[i][0]+dirs[di][0], nc = trees[i][1]+dirs[di][1];
      if (nr>=0 && nr<size && nc>=0 && nc<size && grid[nr][nc] !== 1) o.push([nr,nc]);
    }
    if (!o.length) return { count: 0 };
    opts.push(o);
  }
  var asgn = []; for (var i=0;i<n;i++) asgn.push(null);
  var cnt = 0;
  function bt(idx) {
    if (idx===n) { cnt++; return cnt>=maxCount; }
    for (var k=0; k<opts[idx].length; k++) {
      var tr=opts[idx][k][0], tc=opts[idx][k][1];
      var occ=false; for (var j=0;j<idx;j++) if (asgn[j][0]===tr && asgn[j][1]===tc) {occ=true;break;}
      if (occ) continue;
      var adj=false; for (var j2=0;j2<idx;j2++) if (isAdj(tr,tc,asgn[j2][0],asgn[j2][1])) {adj=true;break;}
      if (adj) continue;
      asgn[idx]=[tr,tc]; if (bt(idx+1)) return true;
    }
    return false;
  }
  bt(0); return { count: cnt };
}

function validate(trees, tents) {
  for (var i = 0; i < trees.length; i++) {
    if (!isAdj(trees[i][0],trees[i][1],tents[i][0],tents[i][1])) return false;
  }
  for (var i = 0; i < tents.length; i++) {
    for (var j = i+1; j < tents.length; j++) {
      if (isAdj(tents[i][0],tents[i][1],tents[j][0],tents[j][1])) return false;
    }
    var ac = 0;
    for (var k = 0; k < trees.length; k++) {
      if (isAdj(tents[i][0],tents[i][1],trees[k][0],trees[k][1])) ac++;
    }
    if (ac !== 1) return false;
  }
  return true;
}

// Test
var diffs = ['easy','medium','hard'];
for (var di = 0; di < diffs.length; di++) {
  var diff = diffs[di];
  var ok=0, fail=0, notValid=0, notUniq=0;
  var t0 = Date.now();
  for (var i = 0; i < 50; i++) {
    var tc = TREE_COUNTS[diff][0] + Math.floor(Math.random()*(TREE_COUNTS[diff][1]-TREE_COUNTS[diff][0]+1));
    var sol = buildSolution(SIZES[diff], tc);
    if (!sol) { fail++; continue; }
    if (!validate(sol.trees, sol.tents)) { notValid++; continue; }
    var r = countSolutions(sol.grid, SIZES[diff], 2);
    if (r.count === 1) ok++; else notUniq++;
  }
  console.log(diff + ': ok=' + ok + ' fail=' + fail + ' notValid=' + notValid + ' notUnique=' + notUniq + ' (' + ((Date.now()-t0)/1000).toFixed(1) + 's)');
}
