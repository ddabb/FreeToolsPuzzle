// Masyu v12 - medium & hard 测试
const DIRS = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
const CONFIG = {medium:{size:8,pearlDensity:0.38,blackRatio:0.5},hard:{size:10,pearlDensity:0.40,blackRatio:0.55}};

function generatePath(dotSize) {
  const visited = new Set(); const result = [];
  for (let c=0;c<dotSize;c++){result.push([0,c]);visited.add('0,'+c);}
  for (let r=1;r<dotSize;r++){result.push([r,dotSize-1]);visited.add(r+','+(dotSize-1));}
  for (let c=dotSize-2;c>=0;c--){result.push([dotSize-1,c]);visited.add((dotSize-1)+','+c);}
  for (let r=dotSize-2;r>=1;r--){result.push([r,0]);visited.add(r+',0');}
  while (result.length < dotSize*dotSize-2) {
    const candidates = [];
    for (let i=0;i<result.length;i++) {
      const curr=result[i], next=result[(i+1)%result.length];
      const dir={dr:next[0]-curr[0],dc:next[1]-curr[1]};
      for (const d of DIRS) {
        if(d.dr===0&&dir.dr===0||d.dc===0&&dir.dc===0)continue;
        const r1=curr[0]+d.dr,c1=curr[1]+d.dc;
        const r2=next[0]+d.dr,c2=next[1]+d.dc;
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

function countExt(path,startIdx,dr,dc,steps,pearlSet) {
  let count=0,r=path[startIdx][0]+dr,c=path[startIdx][1]+dc;
  while(count<steps&&r>=0&&c>=0){
    const idx=path.findIndex(p=>p[0]===r&&p[1]===c);
    if(idx===-1)break;
    if(pearlSet.has(r+','+c))break;
    count++;r+=dr;c+=dc;
  }
  return count;
}

function genCand(path,dotSize,config) {
  const candidates=[]; const pearlSet=new Set();
  for(let i=0;i<path.length;i++){
    const curr=path[i], prev=path[(i-1+path.length)%path.length], next=path[(i+1)%path.length];
    const inD={dr:curr[0]-prev[0],dc:curr[1]-prev[1]}, outD={dr:next[0]-curr[0],dc:next[1]-curr[1]};
    const isTurn=(inD.dr*outD.dr+inD.dc*outD.dc)===0;
    if(isTurn){
      const f=countExt(path,i,outD.dr,outD.dc,1,pearlSet);
      const b=countExt(path,(i-1+path.length)%path.length,-inD.dr,-inD.dc,1,pearlSet);
      if(f>=1&&b>=1){candidates.push({r:curr[0],c:curr[1],type:'black',f,b});pearlSet.add(curr[0]+','+curr[1]);}
    } else {
      const f=countExt(path,i,outD.dr,outD.dc,2,pearlSet);
      const b=countExt(path,(i-1+path.length)%path.length,-inD.dr,-inD.dc,2,pearlSet);
      if(f>=2&&b>=2){candidates.push({r:curr[0],c:curr[1],type:'white',f,b});pearlSet.add(curr[0]+','+curr[1]);}
    }
  }
  return candidates;
}

function selPearls(candidates,dotSize,config){
  const target=Math.floor(dotSize*dotSize*config.pearlDensity);
  const bTarget=Math.floor(target*config.blackRatio);
  const blacks=candidates.filter(c=>c.type==='black'), whites=candidates.filter(c=>c.type==='white');
  const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const sb=shuffle(blacks).slice(0,Math.min(bTarget,blacks.length));
  const rem=target-sb.length;
  const sw=shuffle(whites).slice(0,rem);
  return [...sb,...sw].map(p=>({r:p.r,c:p.c,type:p.type}));
}

function genPuzzle(difficulty,id){
  const config=CONFIG[difficulty], dotSize=config.size+1;
  const path=generatePath(dotSize);
  if(path.length<dotSize*dotSize*0.5)return null;
  const candidates=genCand(path,dotSize,config);
  if(candidates.length<5)return null;
  const pearls=selPearls(candidates,dotSize,config);
  if(pearls.length<3)return null;
  return {id,difficulty,size:config.size,dotSize,pearls,path:path.map(p=>p[0]*dotSize+p[1]),pearlCount:pearls.length,blackCount:pearls.filter(p=>p.type==='black').length,whiteCount:pearls.filter(p=>p.type==='white').length};
}

function validate(puzzle){
  const {path,pearls,dotSize}=puzzle;
  const pearlSet=new Set(pearls.map(p=>p.r+','+p.c));
  const pathCoords=path.map(id=>[Math.floor(id/dotSize),id%dotSize]);
  for(const pearl of pearls){
    const idx=pathCoords.findIndex(p=>p[0]===pearl.r&&p[1]===pearl.c);
    if(idx===-1)return{ok:false,reason:'pearl not on path'};
    const prev=pathCoords[(idx-1+pathCoords.length)%pathCoords.length];
    const next=pathCoords[(idx+1)%pathCoords.length];
    const inD={dr:pearl.r-prev[0],dc:pearl.c-prev[1]}, outD={dr:next[0]-pearl.r,dc:next[1]-pearl.c};
    const isTurn=(inD.dr*outD.dr+inD.dc*outD.dc)===0;
    if(pearl.type==='black'){
      if(!isTurn)return{ok:false,reason:'black must turn'};
      for(let s=1;s<=1;s++){
        const fr=pearl.r+outD.dr*s,fc=pearl.c+outD.dc*s;
        const br=pearl.r-inD.dr*s,bc=pearl.c-inD.dc*s;
        if(!pathCoords.some(p=>p[0]===fr&&p[1]===fc))return{ok:false,reason:'black fwd ext missing'};
        if(!pathCoords.some(p=>p[0]===br&&p[1]===bc))return{ok:false,reason:'black bwd ext missing'};
      }
    } else {
      if(isTurn)return{ok:false,reason:'white must be straight'};
      for(let s=1;s<=2;s++){
        const fr=pearl.r+outD.dr*s,fc=pearl.c+outD.dc*s;
        const br=pearl.r-inD.dr*s,bc=pearl.c-inD.dc*s;
        if(!pathCoords.some(p=>p[0]===fr&&p[1]===fc))return{ok:false,reason:'white fwd ext missing'};
        if(!pathCoords.some(p=>p[0]===br&&p[1]===bc))return{ok:false,reason:'white bwd ext missing'};
      }
    }
  }
  return{ok:true};
}

function test(difficulty, limit) {
  let s=0, f=0;
  for(let i=1;i<=500;i++){
    const p=genPuzzle(difficulty,i);
    if(!p)continue;
    const v=validate(p);
    const mark=v.ok?'OK':'FAIL';
    if(v.ok) s++; else f++;
    console.log(mark+' ['+difficulty+'] #'+i+': '+p.pearlCount+'珠('+p.blackCount+'黑/'+p.whiteCount+'白) path长'+p.path.length+(v.ok?'':' <- '+v.reason));
    if(s+f>=limit)break;
  }
  console.log('--- '+difficulty+': '+s+' OK / '+f+' FAIL ---\n');
}

test('medium', 10);
test('hard', 10);
