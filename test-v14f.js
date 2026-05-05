// Tents v14f - 间距2 + 高密度 + 行列提示
// 行列提示是标准Tents规则的核心约束，能大幅提升唯一解率

var SIZES = { easy: 6, medium: 8, hard: 10 };
// 提高密度
var TREE_COUNTS = { easy: [4, 6], medium: [7, 9], hard: [10, 13] };

function isAdj(r1,c1,r2,c2){return Math.abs(r1-r2)<=1&&Math.abs(c1-c2)<=1&&!(r1===r2&&c1===c2);}
function getNeighbors(r,c,size){return [[-1,0],[1,0],[0,-1],[0,1]].map(function(d){return[r+d[0],c+d[1]];}).filter(function(p){return p[0]>=0&&p[0]<size&&p[1]>=0&&p[1]<size;});}
function hasAdjTent(nt,tents){for(var i=0;i<tents.length;i++)if(isAdj(nt[0],nt[1],tents[i][0],tents[i][1]))return true;return false;}

function buildSolution(size, targetTrees) {
  var grid=[];
  for(var r=0;r<size;r++){grid[r]=[];for(var c=0;c<size;c++)grid[r][c]=0;}
  var trees=[],tents=[];
  for(var pair=0;pair<targetTrees;pair++){
    var placed=false;
    for(var att=0;att<500;att++){
      var sr=Math.floor(Math.random()*size),sc=Math.floor(Math.random()*size);
      if(grid[sr][sc]!==0)continue;
      // 间距≥2（切比雪夫距离），保证1:1帐篷有可能
      var tooClose=false;
      for(var i=0;i<trees.length;i++){if(Math.max(Math.abs(sr-trees[i][0]),Math.abs(sc-trees[i][1]))<2){tooClose=true;break;}}
      if(tooClose)continue;
      // 树不紧邻已有帐篷
      var treeNearTent=false;
      for(var i=0;i<tents.length;i++){if(isAdj(sr,sc,tents[i][0],tents[i][1])){treeNearTent=true;break;}}
      if(treeNearTent)continue;
      grid[sr][sc]=1;
      // 找独占帐篷位
      var spots=getNeighbors(sr,sc,size).filter(function(p){
        if(grid[p[0]][p[1]]!==0)return false;
        if(hasAdjTent(p,tents))return false;
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
  // 计算行列提示
  var rowCounts=[],colCounts=[];
  for(var r=0;r<size;r++){var cnt=0;for(var i=0;i<tents.length;i++)if(tents[i][0]===r)cnt++;rowCounts.push(cnt);}
  for(var c=0;c<size;c++){var cnt=0;for(var i=0;i<tents.length;i++)if(tents[i][1]===c)cnt++;colCounts.push(cnt);}
  return{grid:grid,trees:trees,tents:tents,rowCounts:rowCounts,colCounts:colCounts};
}

// 1:1求解器 + 行列约束
function countSolutions1to1(grid,size,maxCount,rowCounts,colCounts){
  maxCount=maxCount||2;
  var trees=[];for(var r=0;r<size;r++)for(var c=0;c<size;c++)if(grid[r][c]===1)trees.push([r,c]);
  if(!trees.length)return{count:0};
  var n=trees.length;
  var opts=trees.map(function(t){return getNeighbors(t[0],t[1],size).filter(function(p){return grid[p[0]][p[1]]!==1;});});
  if(opts.some(function(p){return !p.length;}))return{count:0};
  var asgn=[];for(var i=0;i<n;i++)asgn.push(null);
  // 行列帐篷计数
  var rowTents=[];for(var r=0;r<size;r++)rowTents[r]=0;
  var colTents=[];for(var c=0;c<size;c++)colTents[c]=0;
  var cnt=0,firstSol=null;
  function bt(idx){
    if(idx===n){
      // 验证行列约束
      if(rowCounts&&colCounts){
        for(var r=0;r<size;r++)if(rowTents[r]!==rowCounts[r])return false;
        for(var c=0;c<size;c++)if(colTents[c]!==colCounts[c])return false;
      }
      cnt++;if(!firstSol)firstSol=asgn.map(function(a){return[a[0],a[1]];});return cnt>=maxCount;
    }
    for(var k=0;k<opts[idx].length;k++){
      var tr=opts[idx][k][0],tc=opts[idx][k][1];
      var occ=false;for(var j=0;j<idx;j++)if(asgn[j][0]===tr&&asgn[j][1]===tc){occ=true;break;}
      if(occ)continue;
      var adj=false;for(var j2=0;j2<idx;j2++)if(isAdj(tr,tc,asgn[j2][0],asgn[j2][1])){adj=true;break;}
      if(adj)continue;
      // 1:1
      var nearOther=false;for(var t=0;t<n;t++){if(t===idx)continue;if(isAdj(tr,tc,trees[t][0],trees[t][1])){nearOther=true;break;}}
      if(nearOther)continue;
      // 行列提前剪枝
      if(rowCounts&&colCounts){
        if(rowTents[tr]+1>rowCounts[tr])continue;
        if(colTents[tc]+1>colCounts[tc])continue;
      }
      asgn[idx]=[tr,tc];rowTents[tr]++;colTents[tc]++;
      if(bt(idx+1)){rowTents[tr]--;colTents[tc]--;return true;}
      rowTents[tr]--;colTents[tc]--;
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
    var r=countSolutions1to1(sol.grid,SIZES[diff],2,sol.rowCounts,sol.colCounts);
    if(r.count===0)noSol++;
    else if(r.count===1)ok++;
    else multiSol++;
  }
  console.log(diff+': ok='+ok+' fail='+fail+' noSol='+noSol+' multiSol='+multiSol+' ('+((Date.now()-t0)/1000).toFixed(1)+'s)');
}
