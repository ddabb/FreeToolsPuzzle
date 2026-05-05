// Tents v14c - 先保证唯一解，再过滤1:1
// 策略：用v13密集放树法，生成后验证帐篷只紧邻自己的树

var SIZES = { easy: 6, medium: 8, hard: 10 };
var TREE_COUNTS = { easy: [3, 5], medium: [4, 6], hard: [5, 8] };

function getNeighbors(r, c, size) {
  return [[-1,0],[1,0],[0,-1],[0,1]].map(function(d){return [r+d[0],c+d[1]];}).filter(function(p){return p[0]>=0&&p[0]<size&&p[1]>=0&&p[1]<size;});
}
function isAdj(r1,c1,r2,c2){return Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1&&!(r1===r2&&c1===c2);}
function hasAdjTent(nt,tents){for(var i=0;i<tents.length;i++)if(isAdj(nt[0],nt[1],tents[i][0],tents[i][1]))return true;return false;}

// v13风格密集放树
function buildSolution(size, targetTrees) {
  var grid=[];
  for(var r=0;r<size;r++){grid[r]=[];for(var c=0;c<size;c++)grid[r][c]=0;}
  var trees=[],tents=[];

  // 核心：先放2个相邻树
  for(var t1=0;t1<200;t1++){
    var r1=Math.floor(Math.random()*size),c1=Math.floor(Math.random()*size);
    grid[r1][c1]=1;trees.push([r1,c1]);
    var sp1=getNeighbors(r1,c1,size).filter(function(p){return grid[p[0]][p[1]]===0;});
    if(!sp1.length){grid[r1][c1]=0;trees.pop();continue;}
    var t1c=sp1[Math.floor(Math.random()*sp1.length)];tents.push(t1c);
    var dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    var adj=dirs.map(function(d){return [r1+d[0],c1+d[1]];}).filter(function(p){return p[0]>=0&&p[0]<size&&p[1]>=0&&p[1]<size&&grid[p[0]][p[1]]===0;});
    if(!adj.length){grid[r1][c1]=0;tents.pop();trees.pop();continue;}
    var r2c=adj[Math.floor(Math.random()*adj.length)];
    grid[r2c[0]][r2c[1]]=1;trees.push(r2c);
    var sp2=getNeighbors(r2c[0],r2c[1],size).filter(function(p){return grid[p[0]][p[1]]===0&&!hasAdjTent(p,tents);});
    if(!sp2.length){grid[r2c[0]][r2c[1]]=0;trees.pop();tents.pop();grid[r1][c1]=0;trees.pop();continue;}
    tents.push(sp2[Math.floor(Math.random()*sp2.length)]);
    break;
  }
  if(trees.length<2)return null;

  // 扩展
  for(var att=0;att<1000&&trees.length<targetTrees;att++){
    var cands=[];
    for(var r=0;r<size;r++)for(var c=0;c<size;c++){
      if(grid[r][c]!==0)continue;
      var md=99999;for(var i=0;i<trees.length;i++){var d=Math.abs(r-trees[i][0])+Math.abs(c-trees[i][1]);if(d<md)md=d;}
      cands.push([r,c,md]);
    }
    if(!cands.length)break;cands.sort(function(a,b){return a[2]-b[2];});
    var topN=Math.min(8,cands.length);
    var sc=cands[Math.floor(Math.random()*topN)];
    grid[sc[0]][sc[1]]=1;trees.push(sc);
    var spots=getNeighbors(sc[0],sc[1],size).filter(function(p){return grid[p[0]][p[1]]===0&&!hasAdjTent(p,tents);});
    if(!spots.length){grid[sc[0]][sc[1]]=0;trees.pop();continue;}
    tents.push(spots[Math.floor(Math.random()*spots.length)]);
  }
  if(trees.length<3)return null;
  return{grid:grid,trees:trees,tents:tents};
}

// 唯一解求解（含帐篷不相邻约束）
function countSolutions(grid,size,maxCount){
  maxCount=maxCount||2;
  var trees=[];for(var r=0;r<size;r++)for(var c=0;c<size;c++)if(grid[r][c]===1)trees.push([r,c]);
  if(!trees.length)return{count:0};
  var n=trees.length;
  var opts=trees.map(function(t){return getNeighbors(t[0],t[1],size).filter(function(p){return grid[p[0]][p[1]]!==1;});});
  if(opts.some(function(p){return !p.length;}))return{count:0};
  var asgn=[];for(var i=0;i<n;i++)asgn.push(null);
  var cnt=0,firstSol=null;
  function bt(idx){
    if(idx===n){cnt++;if(!firstSol)firstSol=asgn.map(function(a){return[a[0],a[1]];});return cnt>=maxCount;}
    for(var k=0;k<opts[idx].length;k++){
      var tr=opts[idx][k][0],tc=opts[idx][k][1];
      var occ=false;for(var j=0;j<idx;j++)if(asgn[j][0]===tr&&asgn[j][1]===tc){occ=true;break;}
      if(occ)continue;
      var adj=false;for(var j2=0;j2<idx;j2++)if(isAdj(tr,tc,asgn[j2][0],asgn[j2][1])){adj=true;break;}
      if(adj)continue;
      asgn[idx]=[tr,tc];if(bt(idx+1))return true;
    }
    return false;
  }
  bt(0);return{count:cnt,solution:firstSol};
}

// ★ 核心：验证解的1:1 - 每个帐篷只紧邻1棵树
function validate1to1(trees, solTents) {
  for(var i=0;i<solTents.length;i++){
    var adjCount=0;
    for(var j=0;j<trees.length;j++){
      if(isAdj(solTents[i][0],solTents[i][1],trees[j][0],trees[j][1]))adjCount++;
    }
    if(adjCount!==1)return false;
  }
  return true;
}

// 测试
var diffs=['easy','medium','hard'];
for(var di=0;di<diffs.length;di++){
  var diff=diffs[di];
  var ok=0,fail=0,notUniq=0,not1to1=0;
  var t0=Date.now();
  for(var i=0;i<100;i++){
    var tc=TREE_COUNTS[diff][0]+Math.floor(Math.random()*(TREE_COUNTS[diff][1]-TREE_COUNTS[diff][0]+1));
    var sol=buildSolution(SIZES[diff],tc);
    if(!sol){fail++;continue;}
    var r=countSolutions(sol.grid,SIZES[diff],2);
    if(r.count!==1){notUniq++;continue;}
    // 验证唯一解是否1:1
    if(!validate1to1(sol.trees,r.solution)){not1to1++;continue;}
    ok++;
  }
  console.log(diff+': ok='+ok+' fail='+fail+' notUnique='+notUniq+' not1to1='+not1to1+' ('+((Date.now()-t0)/1000).toFixed(1)+'s)');
}
