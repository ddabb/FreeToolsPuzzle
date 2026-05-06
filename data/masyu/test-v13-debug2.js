// 调试：用已知有解的实际 puzzle
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

// ---- 求解器代码 (从test-v13d.js复制) ----
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
              usedEdges.add(k);degree[d]++;degree[nb]++;
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
        if(visited.size===N)solutions++;
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
// ---- 求解器结束 ----

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

function genCand(path,dotSize){
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

// 生成一个 puzzle，打印详细信息用于调试
const dotSize = 7; // 6x6格
const path = generatePath(dotSize);
console.log('Path length:', path.length, '(expected:', dotSize*dotSize, ')');
console.log('Path:', path.map(p=>`(${p[0]},${p[1]})`).join('->'));

const cands = genCand(path, dotSize);
console.log('\nPearl candidates:', cands.length);
console.log('Cand details:', cands.map(c=>`(${c.r},${c.c})${c.type}`).join(' '));

// 取前几个珍珠
const pearls = cands.slice(0, Math.min(10, cands.length));
console.log('\nSelected pearls:', pearls.map(p=>`(${p.r},${p.c})${p.type}`).join(' '));

// 检查珍珠是否在路径上
const pathSet = new Set(path.map(p=>p[0]+','+p[1]));
console.log('\nAll pearls on path:', pearls.every(p=>pathSet.has(p.r+','+p.c)));

// 打印路径坐标
const pathCoords = path.map(p=>({r:p[0],c:p[1]}));
for(const pearl of pearls){
  const idx = pathCoords.findIndex(p=>p.r===pearl.r&&p.c===pearl.c);
  const prev = pathCoords[(idx-1+pathCoords.length)%pathCoords.length];
  const next = pathCoords[(idx+1)%pathCoords.length];
  const inD={dr:pearl.r-prev.r,dc:pearl.c-prev.c};
  const outD={dr:next.r-pearl.r,dc:next.c-pearl.c};
  const isTurn=(inD.dr*outD.dr+inD.dc*outD.dc)===0;
  console.log(`  Pearl(${pearl.r},${pearl.c})[${pearl.type}]: idx=${idx}, prev(${prev.r},${prev.c}), next(${next.r},${next.c}), isTurn=${isTurn}`);
  // 检查延伸
  for(let s=1;s<=2;s++){
    const fr=pearl.r+outD.dr*s,fc=pearl.c+outD.dc*s;
    const br=pearl.r-inD.dr*s,bc=pearl.c-inD.dc*s;
    const fOk=pathCoords.some(p=>p.r===fr&&p.c===fc);
    const bOk=pathCoords.some(p=>p.r===br&&p.c===bc);
    console.log(`    ext fwd[${s}]: (${fr},${fc}) ${fOk?'✓':'✗'}, bwd[${s}]: (${br},${bc}) ${bOk?'✓':'✗'}`);
  }
}

// ---- 测试 ----
console.log('\n求解器测试:');
const result = solveMasyu(pearls, 6);
console.log('结果:', result);
