// Masyu v13b - 约束传播高效唯一解求解器
const DIRS=[{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];

function solveMasyu(pearls,size){
  const dotSize=size+1,N=dotSize*dotSize;

  // 坐标→索引映射
  const pearlAt={};
  for(const p of pearls) pearlAt[p.r*dotSize+p.c]=p.type;

  // 每个顶点的候选边（相邻顶点）
  const candidates=Array.from({length:N},()=>[]);
  for(let r=0;r<dotSize;r++)for(let c=0;c<dotSize;c++){
    const d=r*dotSize+c;
    for(const d2 of DIRS){
      const nr=r+d2.dr,nc=c+d2.dc;
      if(nr<0||nr>=dotSize||nc<0||nc>=dotSize)continue;
      const nd=nr*dotSize+nc;
      if(nd>d)candidates[d].push(nd);
    }
  }

  // 状态
  const degree=new Array(N).fill(0);
  const edges=new Set(); // "u-v" 边集合
  const edgeOptions=Array.from({length:N},()=>[]); // 每个顶点的可选邻居

  // 初始化：每个顶点最多4个邻居
  for(let d=0;d<N;d++) edgeOptions[d]=[...candidates[d]];

  // 约束传播
  function propagate(){
    let changed=true;
    while(changed){
      changed=false;
      // 1. 度=2的顶点：从候选中移除已用的
      for(let d=0;d<N;d++){
        if(degree[d]===2){
          // 找出已用的邻居
          const usedNeighbors=[];
          for(const e of edges){
            const[a,b]=e.split('-').map(Number);
            if(a===d)usedNeighbors.push(b);
            else if(b===d)usedNeighbors.push(a);
          }
          if(usedNeighbors.length===2){
            // 找出未用的候选
            const remaining=edgeOptions[d].filter(n=>!usedNeighbors.includes(n));
            if(remaining.length>0){
              for(const n of remaining){
                const key=d<n?`${d}-${n}`:`${n}-${d}`;
                if(!edges.has(key)){
                  edges.add(key);
                  degree[d]++;
                  degree[n]++;
                  changed=true;
                }
              }
              edgeOptions[d]=usedNeighbors; // 只剩已用的两个
            }
          }
        }
      }
      // 2. 候选为空但度<2 → 死路
      for(let d=0;d<N;d++){
        if(degree[d]<2&&edgeOptions[d].length===0)return false;
      }
    }
    return true;
  }

  // 选择分支顶点（优先选约束强的珍珠点）
  function chooseBranch(){
    // 找度<2且候选最少的顶点
    let best=-1,bestCount=Infinity;
    for(const pearl of pearls){
      const d=pearl.r*dotSize+pearl.c;
      if(degree[d]<2&&edgeOptions[d].length<bestCount&&edgeOptions[d].length>0){
        best=d;bestCount=edgeOptions[d].length;
      }
    }
    if(best===-1){
      // 无珍珠可选，找任意度<2的顶点
      for(let d=0;d<N;d++){
        if(degree[d]<2&&edgeOptions[d].length<bestCount&&edgeOptions[d].length>0){
          best=d;bestCount=edgeOptions[d].length;
        }
      }
    }
    return best;
  }

  // 验证珍珠约束
  function checkPearlConstraint(d){
    const type=pearlAt[d];
    if(!type)return true; // 非珍珠顶点
    if(degree[d]===0)return true; // 还没连边

    const neighbors=[];
    for(const e of edges){
      const[a,b]=e.split('-').map(Number);
      if(a===d)neighbors.push(b);
      else if(b===d)neighbors.push(a);
    }
    if(neighbors.length!==2)return true; // 还没连满，继续

    const pr=Math.floor(d/dotSize),pc=d%dotSize;
    const r1=Math.floor(neighbors[0]/dotSize),c1=neighbors[0]%dotSize;
    const r2=Math.floor(neighbors[1]/dotSize),c2=neighbors[1]%dotSize;
    const dr1=r1-pr,dc1=c1-pc,dr2=r2-pr,dc2=c2-pc;
    const dotProduct=dr1*dr2+dc1*dc2;
    const isTurn=dotProduct===0;

    if(type==='black')return isTurn;
    else return !isTurn;
  }

  let solutions=0;

  function backtrack(){
    if(solutions>=2)return; // 找到2个就停止

    // 约束传播
    if(!propagate())return;

    // 检查珍珠约束
    for(let d=0;d<N;d++){
      if(!checkPearlConstraint(d))return;
    }

    // 选分支
    const d=chooseBranch();
    if(d===-1){
      // 所有点度=2，检查是否形成单环
      // 检查连通性
      if(edges.size===N){
        const first=edges.values().next().value;
        const[s]=first.split('-').map(Number);
        const visited=new Set([s]),queue=[s];
        while(queue.length>0){
          const curr=queue.shift();
          for(const e of edges){
            const[a,b]=e.split('-').map(Number);
            const nb=a===curr?b:(b===curr?a:-1);
            if(nb>=0&&!visited.has(nb)){
              visited.add(nb);queue.push(nb);
            }
          }
        }
        if(visited.size===N)solutions++;
      }
      return;
    }

    // 分支：选d的一个候选邻居
    const options=[...edgeOptions[d]];
    // 优先选方向约束强的
    const type=pearlAt[d];
    if(type){
      // 黑珠/白珠有方向偏好，优先选择能匹配的方向
      options.sort((a,b)=>{
        const ra=Math.floor(a/dotSize),ca=a%dotSize,rd=Math.floor(d/dotSize),cd=d%dotSize;
        const rb=Math.floor(b/dotSize),cb=b%dotSize;
        const dra=ra-rd,dca=ca-cd,drb=rb-rd,dcb=cb-cd;
        // 倾向于与已有邻居方向一致/相反（保持直线）
        return 0; // 保持随机顺序
      });
    }

    for(const nd of options){
      const key=d<nd?`${d}-${nd}`:`${nd}-${d}`;
      if(edges.has(key))continue;
      if(degree[d]>=2||degree[nd]>=2)continue;

      // 尝试应用
      const savedEdges=new Set(edges);
      const savedDeg=[...degree];
      const savedOpts=edgeOptions[d].slice();

      edges.add(key);
      degree[d]++;degree[nd]++;

      backtrack();

      // 恢复
      edges.delete(key);
      for(let i=0;i<N;i++)degree[i]=savedDeg[i];
      edgeOptions[d]=savedOpts;
    }
  }

  backtrack();
  return{solutions,isUnique:solutions===1};
}

module.exports={solveMasyu};
