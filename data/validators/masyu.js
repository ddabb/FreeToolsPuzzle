/**
 * 珍珠 (Masyu) 求解器
 * 使用回溯算法找到所有满足珍珠约束的闭合回路
 */

const CELL_EMPTY = 0;
const CELL_WHITE = 1;
const CELL_BLACK = 2;

const DIRS = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3
};

const DIR_DELTA = [
  [-1, 0],  // TOP
  [0, 1],   // RIGHT
  [1, 0],   // BOTTOM
  [0, -1]   // LEFT
];

const OPPOSITE = [2, 3, 0, 1]; // TOP<->BOTTOM, LEFT<->RIGHT

// 检查路径是否满足珍珠约束
function checkPearlConstraints(grid, lines, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell === CELL_EMPTY) continue;
      
      const line = lines[r][c];
      const edges = [line.top, line.right, line.bottom, line.left];
      const edgeCount = edges.filter(e => e).length;
      
      // 路径必须经过珍珠
      if (edgeCount !== 2) return false;
      
      // 找出哪两个方向有边
      const dirs = [];
      for (let i = 0; i < 4; i++) {
        if (edges[i]) dirs.push(i);
      }
      
      const isTurn = dirs[0] + dirs[1] !== 1 && dirs[0] + dirs[1] !== 5;
      // 相邻方向之和: TOP+RIGHT=1, RIGHT+BOTTOM=3, BOTTOM+LEFT=5, LEFT+TOP=3
      // 对角方向之和: TOP+BOTTOM=2, LEFT+RIGHT=4
      // 所以直行时和为1或3或5，转弯时和为2或4
      // 更简单的方法：检查是否相邻
      const adjacent = Math.abs(dirs[0] - dirs[1]) === 1 || Math.abs(dirs[0] - dirs[1]) === 3;
      
      if (cell === CELL_BLACK) {
        // 黑珍珠：必须转弯
        if (adjacent) return false; // 直行
      } else if (cell === CELL_WHITE) {
        // 白珍珠：必须直行，且进入前必须转弯
        if (!adjacent) return false; // 转弯
        // TODO: 检查进入前是否转弯（更复杂的约束）
      }
    }
  }
  
  return true;
}

// 深度优先搜索生成所有可能的闭合回路
function findAllLoops(grid, size, maxCount = 2) {
  const solutions = [];
  const lines = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({
      top: false, right: false, bottom: false, left: false
    }))
  );
  
  // 收集珍珠位置
  const pearls = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== CELL_EMPTY) {
        pearls.push([r, c]);
      }
    }
  }
  
  if (pearls.length === 0) return []; // 没有约束，无限解
  
  // 找到第一个珍珠作为起点
  const [startR, startC] = pearls[0];
  
  // 从起点向四个方向尝试
  function dfs(r, c, fromDir, path, visited) {
    if (solutions.length >= maxCount) return;
    
    // 检查是否回到起点形成闭合回路
    if (r === startR && c === startC && path.length > 2) {
      // 验证是否满足所有珍珠约束
      if (checkPearlConstraints(grid, lines, size)) {
        // 复制当前 lines 作为解
        const sol = lines.map(row => row.map(cell => ({...cell})));
        solutions.push(sol);
      }
      return;
    }
    
    // 检查是否访问过（除了起点）
    const key = `${r},${c}`;
    if (r !== startR || c !== startC) {
      if (visited.has(key)) return;
      visited.add(key);
    }
    
    // 尝试四个方向
    for (let dir = 0; dir < 4; dir++) {
      if (dir === fromDir) continue; // 不能回头
      
      const [dr, dc] = DIR_DELTA[dir];
      const nr = r + dr;
      const nc = c + dc;
      
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      
      // 标记边
      lines[r][c][['top', 'right', 'bottom', 'left'][dir]] = true;
      lines[nr][nc][['top', 'right', 'bottom', 'left'][OPPOSITE[dir]]] = true;
      
      path.push([nr, nc]);
      dfs(nr, nc, OPPOSITE[dir], path, visited);
      path.pop();
      
      // 回退
      lines[r][c][['top', 'right', 'bottom', 'left'][dir]] = false;
      lines[nr][nc][['top', 'right', 'bottom', 'left'][OPPOSITE[dir]]] = false;
    }
    
    visited.delete(key);
  }
  
  // 从起点开始搜索
  for (let dir = 0; dir < 4; dir++) {
    const [dr, dc] = DIR_DELTA[dir];
    const nr = startR + dr;
    const nc = startC + dc;
    
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
    
    lines[startR][startC][['top', 'right', 'bottom', 'left'][dir]] = true;
    lines[nr][nc][['top', 'right', 'bottom', 'left'][OPPOSITE[dir]]] = true;
    
    dfs(nr, nc, OPPOSITE[dir], [[startR, startC], [nr, nc]], new Set([`${startR},${startC}`]));
    
    lines[startR][startC][['top', 'right', 'bottom', 'left'][dir]] = false;
    lines[nr][nc][['top', 'right', 'bottom', 'left'][OPPOSITE[dir]]] = false;
    
    if (solutions.length >= maxCount) break;
  }
  
  return solutions;
}

// 统计解的数量
function countSolutions(grid, size, maxCount = 2) {
  const solutions = findAllLoops(grid, size, maxCount);
  return solutions.length;
}

module.exports = { countSolutions, findAllLoops, checkPearlConstraints };
