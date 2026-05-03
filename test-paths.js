/**
 * 测试各种路径生成算法
 */

const size = 6;

function generateSnakePath(size) {
  const path = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) {
        path.push([r, c]);
      }
    } else {
      for (let c = size - 1; c >= 0; c--) {
        path.push([r, c]);
      }
    }
  }
  return path;
}

function checkPath(path, size, name) {
  console.log(`\n${name}:`);
  console.log(`  长度: ${path.length}`);
  const [sr, sc] = path[0];
  const [er, ec] = path[path.length - 1];
  const dr = Math.abs(sr - er);
  const dc = Math.abs(sc - ec);
  const adjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  console.log(`  起点: (${sr},${sc})`);
  console.log(`  终点: (${er},${ec})`);
  console.log(`  是否相邻: ${adjacent}`);
  
  if (!adjacent) {
    console.log(`  ❌ 无法形成闭环！`);
  } else {
    console.log(`  ✅ 可以形成闭环`);
  }
}

const spiral = [];
const visited = Array.from({ length: size }, () => Array(size).fill(false));

let top = 0, bottom = size - 1, left = 0, right = size - 1;

while (top <= bottom && left <= right) {
  for (let c = left; c <= right; c++) {
    spiral.push([top, c]);
    visited[top][c] = true;
  }
  top++;

  for (let r = top; r <= bottom; r++) {
    spiral.push([r, right]);
    visited[r][right] = true;
  }
  right--;

  if (top <= bottom) {
    for (let c = right; c >= left; c--) {
      spiral.push([bottom, c]);
      visited[bottom][c] = true;
    }
    bottom--;
  }

  if (left <= right) {
    for (let r = bottom; r >= top; r--) {
      spiral.push([r, left]);
      visited[r][left] = true;
    }
    left++;
  }
}

checkPath(spiral, size, '螺旋路径');
checkPath(generateSnakePath(size), size, '蛇形路径');
