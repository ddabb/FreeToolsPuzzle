// Tents v14e - 树间距≥3 + 1:1 + 唯一解
// 树的切比雪夫距离≥3 → 每个树有独占帐篷位 → 1:1有保证

var SIZES = { easy: 6, medium: 8, hard: 10 };
var TREE_COUNTS = { easy: [3, 5], medium: [5, 7], hard: [7, 10] };

function isAdj(r1,c1,r2,c2){return Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1&&!(r1===r2&&c1===c2);}
function getNeighbors(r,c,size){return [[-1,0],[1,0],[0,-1],[0,1]].map(function(d){return[r+d[0],c+d[1]];}).filter(function(p){return p[0]>=0&&p[0]<size&&p[1]>=0&&p[1]<size;});}

function buildSolution(size, targetTrees) {
  var grid=[];
  for(var r=0;r<size;r++){grid[r]=[];for(var c=0;c<size;c++)grid[r][c]=0;}
  var trees=[],tents=[];

  for(var pair=0;pair<targetTrees;pair++){
    var placed=false;
    for(var att=0;att<500;att++){
      var sr=Math.floor(Math.random()*size),sc=Math.floor(Math.random()*size);
      if(grid[sr][sc]!==0)continue;
      // 树间距≥3（切比雪夫距离）
      var tooClose=false;
      for(var i=0;i<trees.length;i++){if(Math.max(Math.abs(sr-trees[i][0]),Math.abs(sc-trees[i][1]))<3){tooClose=true;break;}}
      if(tooClose)continue;
      // 树不能紧邻已有帐篷
      var treeNearTent=false;
      for(var i=0;i<tents.length;i++){if(isAdj(sr,sc,tents[i][0],tents[i][1])){treeNearTent=true;break;}}
      if(treeNearTent)continue;

      grid[sr][sc]=1;
      // 找独占帐篷位（只紧邻当前树，不紧邻其他树，不与已有帐篷相邻）
      var spots=getNeighbors(sr,sc,size).filter(function(p){
        if(grid[p[0]][p[1]]!==0)return false;
        if(hasAdjTent(p,tents))return false;
        // 不紧邻其他树
        for(var i=0;i<trees.length;i++){if(isAdj(p[0],p[1],trees[i][0],trees[i][1]))return false;}
        return true;
      });
      if(!spots.length){grid[sr][sc]=0;continue;}
      var chosen=spots[Math.floor(Math.random()*spots.length)];
      trees.push([sr,sc]);tents.push(chosen);
      placed=true;break;
    }
    if(!placed)break;
  }
  if(trees.length<3)return null;
  return{grid:grid,trees:trees,tents:tents};
}

function hasAdjTent(nt,tents){for(var i=0;i<tents.length;i++)if(isAdj(nt[0],nt[1],tents[i][0],tents[i][1]))return true;return false;}

// 1:1求解器
function countSolutions1to1(grid,size,maxCount){
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
      // 1:1: 帐篷只紧邻当前树
      var nearOther=false;for(var t=0;t<n;t++){if(t===idx)continue;if(isAdj(tr,tc,trees[t][0],trees[t][1])){nearOther=true;break;}}
      if(nearOther)continue;
      asgn[idx]=[tr,tc];if(bt(idx+1))return true;
    }
    return false;
  }
  bt(0);return{count:cnt,solution:firstSol};
}

// 测试
var diffs=['easy','medium','hard'];
for(var di=0;di<diffs.length;di++){
  var diff=diffs[di];
  var ok=0,fail=0,noSol=0,multiSol=0;
  var t0=Date.now();
  for(var i=0;i<100;i++){
    var tc=TREE_COUNTS[diff][0]+Math.floor(Math.random()*(TREE_COUNTS[diff][1]-TREE_COUNTS[diff][0]+1));
    var sol=buildSolution(SIZES[diff],tc);
    if(!sol){fail++;continue;}
    var r=countSolutions1to1(sol.grid,SIZES[diff],2);
    if(r.count===0)noSol++;
    else if(r.count===1)ok++;
    else multiSol++;
  }
  console.log(diff+': ok='+ok+' fail='+fail+' noSol='+noSol+' multiSol='+multiSol+' ('+((Date.now()-t0)/1000).toFixed(1)+'s)');
}
