const d = require('./data/masyu/easy/easy-0010.json');
console.log('size:', d.size);
console.log('grid[0]:', d.grid[0]);
if (d.lines) {
  console.log('lines[0][0]:', JSON.stringify(d.lines[0][0]));
  console.log('lines rows:', d.lines.length);
  let te = 0, be = 0;
  for (let r = 0; r < d.size; r++) {
    for (let c = 0; c < d.size; c++) {
      if (d.lines[r][c].right) te++;
      if (d.lines[r][c].bottom) be++;
    }
  }
  console.log('total right(横边):', te, 'total bottom(竖边):', be);
  
  // 检查是否形成闭合回路
  const size = d.size;
  const visited = new Set();
  // 用 lines 数据追踪路径
  let cr = 0, cc = 0;
  let prevDir = -1;
  let steps = 0;
  
  // 找一个有边的起点
  outer: for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (d.lines[r][c].right || d.lines[r][c].bottom || 
          (r > 0 && d.lines[r-1][c].bottom) || (c > 0 && d.lines[r][c-1].right)) {
        cr = r; cc = c; break outer;
      }
    }
  }
  
  const dirs = [[-1,0,'top'],[1,0,'bottom'],[0,-1,'left'],[0,1,'right']];
  const getLine = (r,c,dir) => {
    if (dir === 'right') return d.lines[r] && d.lines[r][c] ? d.lines[r][c].right : false;
    if (dir === 'bottom') return d.lines[r] && d.lines[r][c] ? d.lines[r][c].bottom : false;
    if (dir === 'top') return r > 0 && d.lines[r-1] && d.lines[r-1][c] ? d.lines[r-1][c].bottom : false;
    if (dir === 'left') return c > 0 && d.lines[r] && d.lines[r][c-1] ? d.lines[r][c-1].right : false;
  };
  
  const opp = {top:'bottom', bottom:'top', left:'right', right:'left'};
  while (steps < size * size * 2) {
    const key = cr + ',' + cc;
    if (visited.has(key)) {
      console.log('回到起点:', key, 'steps:', steps);
      break;
    }
    visited.add(key);
    
    let found = false;
    for (const [dr,dc,dname] of dirs) {
      if (prevDir >= 0 && dname === opp[prevDir]) continue;
      if (getLine(cr, cc, dname)) {
        cr += dr; cc += dc; prevDir = dname; found = true; steps++;
        break;
      }
    }
    if (!found) {
      console.log('死路:', cr, cc, 'steps:', steps, 'visited:', visited.size);
      break;
    }
  }
  console.log('最终位置:', cr, cc, '起点: 0,0', '闭合:', cr===0&&cc===0);
}
