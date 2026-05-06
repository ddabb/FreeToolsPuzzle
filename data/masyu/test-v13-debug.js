// 调试：用已知解的简单 puzzle 测试求解器
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

// 一个已知有解的简单 puzzle: 2x2格 = 3x3点, 路径为环
// 点坐标: (0,0)(0,1)(0,2) (1,0)(1,1)(1,2) (2,0)(2,1)(2,2)
// 路径: (0,0)-(0,1)-(0,2)-(1,2)-(2,2)-(2,1)-(2,0)-(1,0)-(0,0) [8条边]
const dotSize = 3; // 2x2格
const N = dotSize * dotSize; // 9点

// 用 path IDs 表示: id = r*dotSize + c
// 路径 = [0,1,2,5,8,7,4,3] + 回到0 (Hamiltonian cycle on 9 vertices)
// 0->1->2->5->8->7->4->3->0 [9条边,9个点,形成闭合环]
const pathIds = [0,1,2,5,8,7,4,3]; // 9个不同的点

// 在点5 (r=1,c=2) 放黑珠：路径上 prev=2,next=8, 垂直转弯
// 在点7 (r=2,c=1) 放白珠：路径上 prev=8,next=4, 水平直线
// 在点3 (r=1,c=0) 放白珠：路径上 prev=3,next=0, 水平直线
const pearls = [
  {r:1,c:2,type:'black'},  // id=5, 转弯
  {r:2,c:1,type:'white'},  // id=7, 直线
  {r:1,c:0,type:'white'},  // id=3, 直线
];

// 期望：至少1个解（原路径就是解）
const solveMasyu=require('./test-v13d.js').solveMasyu||null;

// 复制求解器代码
function solve(pearls,size){
  const dotSize=size+1,N=dotSize*dotSize;
  const pearlAt={};
  for(const p of pearls) pearlAt[p.r*dotSize+p.c]=p.type;
  const adj=Array.from({length:N},()=>[]);
  for(let r=0;r<dotSize;r++)for(let c=0;c<dotSize;c++){
    const d=r*dotSize+c;
    for(const dd of DIRS){
      const nr=r+dd.dr,nc=c+dd.dc;
      if(nr<0||nr>=dotSize||nc<0||nc>=dotSize)continue;
      adj[d].push(nr*dotSize+nc);
    }
  }
  let solutions=0;
  const degree=new Array(N).fill(0);
  const usedEdges=new Set();
  function pearlOK(d){
    const type=pearlAt[d];
    if(!type||degree[d]!==2)return true;
    const nb=[];
    for(const e of usedEdges){
      const[a,b]=e.split('-').map(Number);
      if(a===d)nb.push(b);
      else if(b===d)nb.push(a);
    }
    if(nb.length!==2)return true;
    const r=Math.floor(d/dotSize),c=d%dotSize;
    const r1=Math.floor(nb[0]/dotSize),c1=nb[0]%dotSize;
    const r2=Math.floor(nb[1]/dotSize),c2=nb[1]%dotSize;
    const dr1=r1-r,dc1=c1-c,dr2=r2-r,dc2=c2-c;
    const isTurn=(dr1*dr2+dc1*dc2)===0;
    return type==='black'?isTurn:!isTurn;
  }
  function isDeadEnd(){
    for(let d=0;d<N;d++){
      if(degree[d]>2)return true;
      if(degree[d]===2&&!pearlOK(d))return true;
      if(degree[d]===1){
        let hasAvail=false;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k)){hasAvail=true;break;}
          }
        }
        if(!hasAvail)return true;
      }
    }
    return false;
  }
  function propagate(){
    let changed=true;
    while(changed){
      changed=false;
      for(let d=0;d<N;d++){
        if(degree[d]===1){
          let candidates=[];
          for(const nb of adj[d]){
            if(degree[nb]<2){
              const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
              if(!usedEdges.has(k))candidates.push(nb);
            }
          }
          if(candidates.length===1){
            const nb=candidates[0];
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k)){
              usedEdges.add(k);
              degree[d]++;degree[nb]++;
              if(!pearlOK(d)||!pearlOK(nb)){
                usedEdges.delete(k);degree[d]--;degree[nb]--;
                return false;
              }
              changed=true;
            }
          }
        }
        if(degree[d]===2&&!pearlOK(d))return false;
      }
      if(isDeadEnd())return false;
    }
    return true;
  }
  function chooseVertex(){
    let best=-1,bestCount=Infinity;
    for(const pearl of pearls){
      const d=pearl.r*dotSize+pearl.c;
      if(degree[d]<2){
        let cnt=0;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k))cnt++;
          }
        }
        if(cnt>0&&cnt<bestCount){best=d;bestCount=cnt;}
      }
    }
    if(best===-1){
      for(let d=0;d<N;d++){
        if(degree[d]<2){
          let cnt=0;
          for(const nb of adj[d]){
            if(degree[nb]<2){
              const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
              if(!usedEdges.has(k))cnt++;
            }
          }
          if(cnt>0&&cnt<bestCount){best=d;bestCount=cnt;}
        }
      }
    }
    return best;
  }
  function backtrack(depth){
    if(solutions>=2)return;
    if(depth>20)return; // 限制深度防爆
    if(!propagate())return;
    let allDone=true;
    for(let d=0;d<N;d++)if(degree[d]<2){allDone=false;break;}
    if(allDone){
      if(usedEdges.size===N){
        const first=usedEdges.values().next().value;
        const[s]=first.split('-').map(Number);
        const visited=new Set([s]),queue=[s];
        while(queue.length>0){
          const curr=queue.shift();
          for(const e of usedEdges){
            const[a,b]=e.split('-').map(Number);
            const nb=a===curr?b:(b===curr?a:-1);
            if(nb>=0&&!visited.has(nb)){visited.add(nb);queue.push(nb);}
          }
        }
        if(visited.size===N){solutions++;console.log('  解 #'+(solutions)+':',[...usedEdges].sort());}
      }
      return;
    }
    const v=chooseVertex();
    if(v===-1)return;
    const candidates=[];
    for(const nb of adj[v]){
      if(degree[nb]>=2)continue;
      const k=v<nb?`${v}-${nb}`:`${nb}-${v}`;
      if(usedEdges.has(k))continue;
      candidates.push({nb,k});
    }
    for(const {nb,k} of candidates){
      usedEdges.add(k);
      const oldDegV=degree[v],oldDegNb=degree[nb];
      degree[v]++;degree[nb]++;
      backtrack(depth+1);
      degree[v]=oldDegV;degree[nb]=oldDegNb;
      usedEdges.delete(k);
    }
  }
  backtrack(0);
  return{solutions,isUnique:solutions===1};
}

console.log('测试简单 puzzle (3x3点, 2个珍珠):');
console.log('珍珠:', JSON.stringify(pearls));
const result = solve(pearls, 2);
console.log('结果:', result);
console.log('期望: solutions >= 1');
console.log('');
console.log('如果 solutions=0, 说明求解器有bug');
console.log('如果 solutions>1, 说明有多解');

// 也打印所有候选珍珠
console.log('\n3x3点相邻关系:');
for(let d=0;d<N;d++){
  const r=Math.floor(d/dotSize),c=d%dotSize;
  console.log(`  点${d}(${r},${c}):`, adj[d]);
}
