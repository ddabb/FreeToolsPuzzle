// Masyu v13 DLX 求解器测试
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
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

// DLX求解器
function solveUnique(pearls,size){
  const dotSize=size+1,N=dotSize*dotSize;
  const pearlAt={};
  for(const p of pearls) pearlAt[p.r*dotSize+p.c]=p.type;

  const rows=[];
  for(let u=0;u<N;u++){
    const ur=Math.floor(u/dotSize),uc=u%dotSize;
    for(let v=u+1;v<N;v++){
      const vr=Math.floor(v/dotSize),vc=v%dotSize;
      if(Math.abs(ur-vr)+Math.abs(uc-vc)!==1)continue;
      rows.push({u,v});
    }
  }

  const coverCount=new Array(2*N).fill(0);
  const rowForCol=Array.from({length:2*N},()=>[]);
  const colForCell=[];
  for(let ri=0;ri<rows.length;ri++){
    const{u,v}=rows[ri];
    colForCell.push([u,ri],[v,ri]);
    rowForCol[u].push(ri);
    rowForCol[v].push(ri);
  }

  const selected=[];let solutionCount=0;

  function solve(){
    if(solutionCount>=2)return;
    let minCol=-1,minCount=Infinity;
    for(let c=0;c<2*N;c++){if(coverCount[c]<minCount&&coverCount[c]>=0){minCount=coverCount[c];minCol=c;}}
    if(minCol===-1||minCount===Infinity){
      if(selected.length===N){solutionCount++;}
      return;
    }
    if(minCount===0)return;
    for(const ri of rowForCol[minCol]){
      const{u,v}=rows[ri];
      if(coverCount[u]>=2||coverCount[v]>=2)continue;
      for(let ci=0;ci<colForCell.length;ci++){const c=colForCell[ci][0];if(coverCount[c]>=0)coverCount[c]++;}
      selected.push(ri);solve();selected.pop();
      for(let ci=0;ci<colForCell.length;ci++){const c=colForCell[ci][0];if(coverCount[c]>=0)coverCount[c]--;}
    }
  }
  solve();
  return{solutions:solutionCount,isUnique:solutionCount===1};
}

console.log('DLX 求解器测试 - 10题 easy:');
let s=0,f=0,totalMs=0;
for(let i=0;i<50;i++){
  const dotSize=7,path=generatePath(dotSize);
  if(path.length<dotSize*dotSize*0.5)continue;
  const cands=genCand(path,dotSize,CONFIG.easy);
  if(cands.length<5)continue;
  const pearls=selPearls(cands,dotSize,CONFIG.easy);
  if(pearls.length<3)continue;
  const t0=Date.now();
  const result=solveUnique(pearls,6);
  const ms=Date.now()-t0;
  totalMs+=ms;
  const mark=result.isUnique?'OK':'X';
  console.log(mark+' #'+i+': '+pearls.length+'珠, 解='+result.solutions+', '+ms+'ms');
  if(result.isUnique)s++;else f++;
  if(s+f>=10)break;
}
console.log('\n结果: '+s+'OK / '+f+'FAIL, 平均'+(totalMs/(s+f)).toFixed(1)+'ms/题');
