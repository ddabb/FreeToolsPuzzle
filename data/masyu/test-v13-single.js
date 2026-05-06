// 测试一个最小可行 puzzle: 4x4格=5x5点, N=25边
// 构造一个已知唯一解的简单 puzzle
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

function solveMasyu(pearls,size){
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

  function pearlValid(d){
    const type=pearlAt[d];
    if(!type||degree[d]!==2)return true;
    const nb=[];
    for(const e of usedEdges){
      const[a,b]=e.split('-').map(Number);
      if(a===d)nb.push(b);else if(b===d)nb.push(a);
    }
    if(nb.length!==2)return true;
    const r=Math.floor(d/dotSize),c=d%dotSize;
    const r1=Math.floor(nb[0]/dotSize),c1=nb[0]%dotSize;
    const r2=Math.floor(nb[1]/dotSize),c2=nb[1]%dotSize;
    const dr1=r1-r,dc1=c1-c,dr2=r2-r,dc2=c2-c;
    const isTurn=(dr1*dr2+dc1*dc2)===0;
    return type==='black'?isTurn:!isTurn;
  }

  function deadEnd(){
    for(let d=0;d<N;d++){
      if(degree[d]>2)return true;
      if(degree[d]===2&&!pearlValid(d))return true;
      if(degree[d]===1){
        let ok=false;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k)){ok=true;break;}
          }
        }
        if(!ok)return true;
      }
      if(degree[d]===0){
        let avail=false;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            avail=true;break;
          }
        }
        if(!avail)return true;
      }
    }
    return false;
  }

  function branchVertex(){
    let best=-1,bestN=Infinity;
    for(const pearl of pearls){
      const d=pearl.r*dotSize+pearl.c;
      if(degree[d]<2){
        let n=0;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k))n++;
          }
        }
        if(n>0&&n<bestN){best=d;bestN=n;}
      }
    }
    if(best===-1){
      for(let d=0;d<N;d++){
        if(degree[d]<2){
          let n=0;
          for(const nb of adj[d]){
            if(degree[nb]<2){
              const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
              if(!usedEdges.has(k))n++;
            }
          }
          if(n>0&&n<bestN){best=d;bestN=n;}
        }
      }
    }
    return best;
  }

  function solve(depth){
    if(solutions>=2)return;
    if(deadEnd())return;
    if(depth>100)return; // 深度保护

    let done=true;
    for(let d=0;d<N;d++)if(degree[d]<2){done=false;break;}
    if(done){
      if(usedEdges.size===N){
        solutions++;
      }
      return;
    }

    const v=branchVertex();
    if(v===-1)return;

    const cand=[];
    for(const nb of adj[v]){
      if(degree[nb]>=2)continue;
      const k=v<nb?`${v}-${nb}`:`${nb}-${v}`;
      if(usedEdges.has(k))continue;
      cand.push({nb,k});
    }

    for(const {nb,k} of cand){
      usedEdges.add(k);
      const odv=degree[v],odnb=degree[nb];
      degree[v]++;degree[nb]++;
      solve(depth+1);
      degree[v]=odv;degree[nb]=odnb;
      usedEdges.delete(k);
    }
  }

  solve(0);
  return{solutions,isUnique:solutions===1};
}

// 构造: 3x3格=4x4点, N=16
// 路径: 沿外框走一圈 [0,1,2,3,7,11,15,14,13,12,8,4,5,6,10,9]
// 珠: 角点放黑珠(转弯), 边中点放白珠(直线)
// 路径坐标: (0,0)->(0,1)->(0,2)->(0,3)
//                ↑                    ↓
//               (3,0)<-(3,1)<-(3,2)<-(3,3)
//
// 点ID: r*4+c
// 路径: [0,1,2,3,7,11,15,14,13,12,8,4,5,6,10,9]
// (0,0)->(0,1)->(0,2)->(0,3)->(1,3)->(2,3)->(3,3)->(3,2)->(3,1)->(3,0)->(2,0)->(1,0)->(1,1)->(1,2)->(2,2)->(2,1)->(0,0)  等等要16个点但4x4只有16个点！

// 重新算: 4x4点, 外框路径需要 4+3+3+2 = 12个点
// 中间4个点要绕进来
// 简单哈密顿环: 沿格子边绕一圈然后蛇形填中间
// 最简单的: 绕外框然后填内部
// 点: (0,0)~(3,3)
// 环1 (外框): 0->1->2->3->7->11->15->14->13->12->8->4->0
// 环2 (加内部): 0->1->2->3->7->11->15->14->13->12->8->4->5->9->10->6->0 ... 不对，要回到所有16个点

// 4x4=16点网格，格子坐标(0,0)~(3,3)，所有边长为1的相邻点对都是边
// 哈密顿环示例: 
// 0->1->2->3->7->11->15->14->13->12->8->4->5->6->10->9->0 (16条边形成环)
// 验证: 0→1→2→3↓7↓11↓15←14←13←12↑8↑4→5→6↓10↑9←0... 还是要手动验证

// 用增长法生成一个确定解
// 初始外框: 0,1,2,3,7,11,15,14,13,12,8,4 (12个点)
// 然后向内扩展
const dotSize = 4;
const pathCoords = [];
// 外框
const border = [[0,0],[0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,0],[1,0]];
for(const p of border) pathCoords.push(p);
// 内部4点需要绕进来: (1,1),(1,2),(2,2),(2,1) 
// 加入: (1,1),(1,2),(2,2),(2,1) 形成小环
pathCoords.push([1,1],[1,2],[2,2],[2,1]);
// 现在16个点: [0,1,2,3,7,11,15,14,13,12,8,4,5,9,10,6]
// 等等 [1,1]=5, [1,2]=6, [2,2]=10, [2,1]=9
// 路径: 0,1,2,3,7,11,15,14,13,12,8,4,5,6,10,9
// 验证: 0→1→2→3↓7↓11↓15←14←13←12↑8↑4→5→6↓10↑9←0

console.log('=== 4x4格测试 ===');
console.log('路径点数:', pathCoords.length, '(需要', dotSize*dotSize, ')');

// 放珍珠：黑珠在转角，白珠在直行
// 4x4路径(16点), 检查每个点的前后方向:
const pearls4x4 = [];
for(let i=0;i<pathCoords.length;i++){
  const curr=pathCoords[i];
  const prev=pathCoords[(i-1+pathCoords.length)%pathCoords.length];
  const next=pathCoords[(i+1)%pathCoords.length];
  const inD={dr:curr[0]-prev[0],dc:curr[1]-prev[1]};
  const outD={dr:next[0]-curr[0],dc:next[1]-curr[1]};
  const isTurn=(inD.dr*outD.dr+inD.dc*outD.dc)===0;
  
  // 珍珠约束验证: 前后各延伸检查
  // 对于4x4，边界点的延伸可能超出棋盘
  
  // 简化: 选几个内部转角点放黑珠，边中点放白珠
  // (1,0)=4 和 (3,0)=8 是转角(上下方向切换)
  // (0,1)=1,(0,2)=2,(0,3)=3 是直行
  const r=curr[0],c=curr[1];
  if(isTurn && r>0 && r<3 && c>0 && c<3){
    pearls4x4.push({r,c,type:'black'});
  }
  if(!isTurn && r>0 && r<3 && c>0 && c<3){
    pearls4x4.push({r,c,type:'white'});
  }
}

// 只选3个珍珠减少约束
const pearls4 = [
  {r:1,c:3,type:'black'},  // (1,3) 转角
  {r:3,c:1,type:'black'},  // (3,1) 转角
  {r:2,c:0,type:'black'},  // (2,0) 转角
];

console.log('Pearls:', JSON.stringify(pearls4));

const result = solveMasyu(pearls4, 3); // 3x3格=4x4点
console.log('结果:', result);
console.log('期望: solutions >= 1');
