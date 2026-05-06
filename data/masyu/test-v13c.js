// Masyu v13c - 简洁高效回溯 + 约束传播
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

function solveMasyu(pearls,size){
  const dotSize=size+1,N=dotSize*dotSize;

  // pearlAt: dotId -> 'black'|'white'
  const pearlAt={};
  for(const p of pearls) pearlAt[p.r*dotSize+p.c]=p.type;

  // 相邻表
  const adj=Array.from({length:N},()=>[]);
  for(let r=0;r<dotSize;r++)for(let c=0;c<dotSize;c++){
    const d=r*dotSize+c;
    for(const dd of DIRS){
      const nr=r+dd.dr,nc=c+dd.dc;
      if(nr<0||nr>=dotSize||nc<0||nc>=dotSize)continue;
      adj[d].push(nr*dotSize+nc);
    }
  }

  // 状态
  let solutions=0;
  const degree=new Array(N).fill(0);
  const usedEdges=new Set(); // "min-max" key
  const endPoints=new Set(); // 度=1的顶点集合（路径端点）

  // 检查珍珠约束（当顶点度=2时）
  function pearlOK(d){
    const type=pearlAt[d];
    if(!type||degree[d]!==2)return true;
    // 获取两个邻居
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

  // 检查死路
  function isDeadEnd(){
    for(let d=0;d<N;d++){
      if(degree[d]>2)return true;
      if(degree[d]===2){
        // 检查珍珠
        if(!pearlOK(d))return true;
      }
      if(degree[d]===1){
        // 检查端点是否有可用邻居（度<2）
        let hasAvail=false;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k)){hasAvail=true;break;}
          }
        }
        if(!hasAvail&&endPoints.has(d)){
          // 这个端点无法继续延伸
          // 除非所有点都已度=2
          let allDone=true;
          for(let dd=0;dd<N;dd++)if(degree[dd]<2){allDone=false;break;}
          if(allDone){
            // 检查是否形成单环
            if(usedEdges.size===N)return false; // 成功
            return true; // 边不够，不是完整环
          }
          return true;
        }
      }
    }
    return false;
  }

  // 选择分支顶点
  function chooseVertex(){
    // 优先选度<2且候选边最少的
    let best=-1,bestCount=Infinity;
    for(const pearl of pearls){
      const d=pearl.r*dotSize+pearl.c;
      if(degree[d]<2){
        let avail=0;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k))avail++;
          }
        }
        if(avail>0&&avail<bestCount){best=d;bestCount=avail;}
      }
    }
    if(best===-1){
      for(let d=0;d<N;d++){
        if(degree[d]<2){
          let avail=0;
          for(const nb of adj[d]){
            if(degree[nb]<2){
              const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
              if(!usedEdges.has(k))avail++;
            }
          }
          if(avail>0&&avail<bestCount){best=d;bestCount=avail;}
        }
      }
    }
    return best;
  }

  // 约束传播
  function propagate(){
    let changed=true;
    while(changed){
      changed=false;
      // 规则1：度=2的顶点，只保留已用的两条边
      for(let d=0;d<N;d++){
        if(degree[d]===2){
          const nbUsed=[];
          for(const nb of adj[d]){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(usedEdges.has(k))nbUsed.push(nb);
          }
          if(nbUsed.length===2){
            // 检查珍珠
            if(!pearlOK(d))return false;
          }
        }
        // 规则2：度=0且只有2个邻居候选 = 必须度=2
        if(degree[d]===0&&adj[d].length===2){
          // 检查这两个候选边是否可用
          let k1=d<adj[d][0]?`${d}-${adj[d][0]}`:`${adj[d][0]}-${d}`;
          let k2=d<adj[d][1]?`${d}-${adj[d][1]}`:`${adj[d][1]}-${d}`;
          if(!usedEdges.has(k1)&&!usedEdges.has(k2)&&adj[d][0]<adj[d][1]){
            // 检查两个邻居是否各自还有空间
            if(degree[adj[d][0]]<2&&degree[adj[d][1]]<2){
              // 自动连这两条边
              usedEdges.add(k1);usedEdges.add(k2);
              degree[d]=2;degree[adj[d][0]]++;degree[adj[d][1]]++;
              endPoints.delete(d);
              if(degree[adj[d][0]]===1)endPoints.add(adj[d][0]);
              if(degree[adj[d][1]]===1)endPoints.add(adj[d][1]);
              changed=true;
            }
          }
        }
        // 规则3：度=1的端点，如果只剩1个候选邻居 = 必须连
        if(degree[d]===1){
          let candidates=0;
          for(const nb of adj[d]){
            if(degree[nb]<2){
              const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
              if(!usedEdges.has(k))candidates++;
            }
          }
          if(candidates===1){
            // 找出那个唯一候选
            for(const nb of adj[d]){
              if(degree[nb]<2){
                const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
                if(!usedEdges.has(k)){
                  usedEdges.add(k);
                  degree[d]=2;degree[nb]++;
                  endPoints.delete(d);
                  if(degree[nb]===1)endPoints.add(nb);
                  else endPoints.delete(nb);
                  changed=true;
                  break;
                }
              }
            }
          }
        }
      }
      if(isDeadEnd())return false;
    }
    return true;
  }

  function backtrack(){
    if(solutions>=2)return;

    if(!propagate())return;

    // 检查完成：所有点度=2？
    let allDone=true,hasEnd=false;
    for(let d=0;d<N;d++){
      if(degree[d]<2){allDone=false;}
      if(degree[d]===1)hasEnd=true;
    }

    if(allDone){
      // 检查连通性和单环
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
        if(visited.size===N)solutions++;
      }
      return;
    }

    // 如果有端点但已无法延伸，死路
    if(hasEnd&&endPoints.size===0)return;

    const v=chooseVertex();
    if(v===-1)return;

    // 尝试每条候选边
    for(const nb of adj[v]){
      if(degree[nb]>=2)continue;
      const k=v<nb?`${v}-${nb}`:`${nb}-${v}`;
      if(usedEdges.has(k))continue;

      // 应用
      usedEdges.add(k);
      const oldDegV=degree[v],oldDegNb=degree[nb];
      const wasEndV=endPoints.has(v),wasEndNb=endPoints.has(nb);
      degree[v]++;degree[nb]++;
      if(degree[v]===1)endPoints.add(v);
      if(degree[nb]===1)endPoints.add(nb);
      if(degree[v]===2)endPoints.delete(v);
      if(degree[nb]===2)endPoints.delete(nb);

      backtrack();

      // 恢复
      degree[v]=oldDegV;degree[nb]=oldDegNb;
      usedEdges.delete(k);
      endPoints.delete(v);endPoints.delete(nb);
      if(wasEndV)endPoints.add(v);
      if(wasEndNb)endPoints.add(nb);
    }
  }

  // 初始化端点集合
  for(let d=0;d<N;d++)if(degree[d]===1)endPoints.add(d);

  backtrack();
  return{solutions,isUnique:solutions===1};
}

module.exports={solveMasyu};

const CONFIG={easy:{size:6,pearlDensity:0.35,blackRatio:0.45},medium:{size:8,pearlDensity:0.38,blackRatio:0.5},hard:{size:10,pearlDensity:0.40,blackRatio:0.55}};

function generatePath(dotSize){
  const visited=new Set(),result=[];
  for(let c=0;c<dotSize;c++){result.push([0,c]);visited.add('0,'+c);}
  for(let r=1;r<dotSize;r++){result.push([r,dotSize-1]);visited.add(r+','+(dotSize-1));}
  for(let c=dotSize-2;c>=0;c--){result.push([dotSize-1,c]);visited.add((dotSize-1)+','+c);}
  for(let r=dotSize-2;r>=1;r--){result.push([r,0]);visited.add(r+',0');}
  while(result.length<dotSize*dotSize-2){
    const candidates=[];
    for(let i=0;i<result.length;i++){
      const curr=result[i],next=result[(i+1)%result.length],dir={dr:next[0]-curr[0],dc:next[1]-curr[1]};
      for(const d of DIRS){
        if(d.dr===0&&dir.dr===0||d.dc===0&&dir.dc===0)continue;
        const r1=curr[0]+d.dr,c1=curr[1]+d.dc,r2=next[0]+d.dr,c2=next[1]+d.dc;
        if(r1<0||r1>=dotSize||c1<0||c1>=dotSize)continue;
        if(r2<0||r2>=dotSize||c2<0||c2>=dotSize)continue;
        if(visited.has(r1+','+c1)||visited.has(r2+','+c2))continue;
        candidates.push({index:i,points:[[r1,c1],[r2,c2]]});
      }
    }
    if(candidates.length===0)break;
    const pick=candidates[Math.floor(Math.random()*candidates.length)];
    result.splice(pick.index+1,0,...pick.points);
    visited.add(pick.points[0][0]+','+pick.points[0][1]);
    visited.add(pick.points[1][0]+','+pick.points[1][1]);
  }
  return result;
}

function countExt(path,startIdx,dr,dc,steps,pearlSet){
  let count=0,r=path[startIdx][0]+dr,c=path[startIdx][1]+dc;
  while(count<steps&&r>=0&&c>=0){
    const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
    if(idx===-1)break;
    if(pearlSet.has(r+','+c))break;
    count++;r+=dr;c+=dc;
  }
  return count;
}

function genCand(path,dotSize,config){
  const candidates=[],pearlSet=new Set();
  for(let i=0;i<path.length;i++){
    const curr=path[i],prev=path[(i-1+path.length)%path.length],next=path[(i+1)%path.length];
    const inD={dr:curr[0]-prev[0],dc:curr[1]-prev[1]},outD={dr:next[0]-curr[0],dc:next[1]-curr[1]};
    const isTurn=(inD.dr*outD.dr+inD.dc*outD.dc)===0;
    if(isTurn){
      const f=countExt(path,i,outD.dr,outD.dc,1,pearlSet),b=countExt(path,(i-1+path.length)%path.length,-inD.dr,-inD.dc,1,pearlSet);
      if(f>=1&&b>=1){candidates.push({r:curr[0],c:curr[1],type:'black'});pearlSet.add(curr[0]+','+curr[1]);}
    }else{
      const f=countExt(path,i,outD.dr,outD.dc,2,pearlSet),b=countExt(path,(i-1+path.length)%path.length,-inD.dr,-inD.dc,2,pearlSet);
      if(f>=2&&b>=2){candidates.push({r:curr[0],c:curr[1],type:'white'});pearlSet.add(curr[0]+','+curr[1]);}
    }
  }
  return candidates;
}

function selPearls(candidates,dotSize,config){
  const target=Math.floor(dotSize*dotSize*config.pearlDensity),bTarget=Math.floor(target*config.blackRatio);
  const blacks=candidates.filter(c=>c.type==='black'),whites=candidates.filter(c=>c.type==='white');
  const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const sb=shuffle(blacks).slice(0,Math.min(bTarget,blacks.length));
  return[...sb,...shuffle(whites).slice(0,target-sb.length)].map(p=>({r:p.r,c:p.c,type:p.type}));
}

console.log('v13c 测试 - 10题 easy:');
let s=0,f=0;
for(let i=0;i<50;i++){
  const dotSize=7,path=generatePath(dotSize);
  if(path.length<dotSize*dotSize*0.5)continue;
  const cands=genCand(path,dotSize,CONFIG.easy);
  if(cands.length<5)continue;
  const pearls=selPearls(cands,dotSize,CONFIG.easy);
  if(pearls.length<3)continue;
  const t0=Date.now();
  const result=solveMasyu(pearls,6);
  const ms=Date.now()-t0;
  const mark=result.isUnique?'OK':'X';
  console.log(mark+' #'+i+': '+pearls.length+'珠('+pearls.filter(p=>p.type==='black').length+'黑/'+pearls.filter(p=>p.type==='white').length+'白), 解='+result.solutions+', '+ms+'ms');
  if(result.isUnique)s++;else f++;
  if(s+f>=10)break;
}
console.log('\n结果: '+s+'OK / '+f+'FAIL');
