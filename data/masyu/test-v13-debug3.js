// 诊断：哪个环节导致0解
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
  let backtrackCalls=0,propCalls=0,deadEnds=0;

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
      // 度=0但没有可用邻居
      if(degree[d]===0){
        let avail=false;
        for(const nb of adj[d]){
          if(degree[nb]<2){
            const k=d<nb?`${d}-${nb}`:`${nb}-${d}`;
            if(!usedEdges.has(k)){avail=true;break;}
          }
        }
        if(!avail)return true;
      }
    }
    return false;
  }

  function branchVertex(){
    let best=-1,bestN=Infinity;
    for(const p of pearls){
      const d=p.r*dotSize+p.c;
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

  function solve(){
    backtrackCalls++;
    if(solutions>=2)return;
    if(deadEnd()){deadEnds++;return;}
    if(backtrackCalls>1000000)return; // 超时保护

    let done=true;
    for(let d=0;d<N;d++)if(degree[d]<2){done=false;break;}
    if(done){
      if(usedEdges.size===N){
        const first=usedEdges.values().next().value;
        const[s]=first.split('-').map(Number);
        const vis=new Set([s]),q=[s];
        while(q.length){
          const c=q.shift();
          for(const e of usedEdges){
            const[a,b]=e.split('-').map(Number);
            const nb=a===c?b:(b===c?a:-1);
            if(nb>=0&&!vis.has(nb)){vis.add(nb);q.push(nb);}
          }
        }
        if(vis.size===N){solutions++;console.log('  解! 边数='+usedEdges.size+' 调='+backtrackCalls);}
      }
      return;
    }

    const v=branchVertex();
    if(v===-1){return;}

    const cand=[];
    for(const nb of adj[v]){
      if(degree[nb]>=2)continue;
      const k=v<nb?`${v}-${nb}`:`${nb}-${v}`;
      if(usedEdges.has(k))continue;
      cand.push({nb,k});
    }

    // 洗乱
    for(let i=cand.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [cand[i],cand[j]]=[cand[j],cand[i]];
    }

    for(const {nb,k} of cand){
      usedEdges.add(k);
      const odv=degree[v],odnb=degree[nb];
      degree[v]++;degree[nb]++;
      solve();
      degree[v]=odv;degree[nb]=odnb;
      usedEdges.delete(k);
    }
  }

  solve();
  console.log(`  调用=${backtrackCalls} 死路=${deadEnds}`);
  return{solutions,isUnique:solutions===1};
}

// 固定随机种子，生成确定 puzzle
Math.random = (function(){
  let seed=42;
  return function(){
    seed=(seed*1103515245+12345)&0x7fffffff;
    return seed/0x7fffffff;
  };
})();

const CONFIG={easy:{size:6,pearlDensity:0.35,blackRatio:0.45}};

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

const dotSize=7;
const pathCoords=generatePath(dotSize);
console.log('Path length:', pathCoords.length, '(N dots needed:', dotSize*dotSize, ')');
const cands=genCand(pathCoords,dotSize,CONFIG.easy);
console.log('Pearl candidates:', cands.length);
const pearls=selPearls(cands,dotSize,CONFIG.easy);
console.log('Selected pearls:', pearls.length);
console.log('Pearls:', pearls.map(p=>`(${p.r},${p.c})${p.type}`).join(' '));

// 打印degree=0顶点的邻居状态
const N=dotSize*dotSize;
console.log('\n初始化状态:');
for(let d=0;d<N;d++){
  const nb=adj[d].length;
  if(nb<2)console.log(`  点${d}(${Math.floor(d/dotSize)},${d%dotSize}): ${nb}个邻居`);
}

console.log('\n求解:');
const result=solveMasyu(pearls,6);
console.log('结果:', result);
