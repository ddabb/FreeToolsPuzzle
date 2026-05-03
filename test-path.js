/**
 * 测试路径生成
 */

const size = 6;

function generateSpiralPath(size) {
  const path = [];
  const visited = Array.from({ length: size }, () => Array(size).fill(false));

  let top = 0, bottom = size - 1, left = 0, right = size - 1;

  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) {
      path.push([top, c]);
      visited[top][c] = true;
    }
    top++;

    for (let r = top; r <= bottom; r++) {
      path.push([r, right]);
      visited[r][right] = true;
    }
    right--;

    if (top <= bottom) {
      for (let c = right; c >= left; c--) {
        path.push([bottom, c]);
        visited[bottom][c] = true;
      }
      bottom--;
    }

    if (left <= right) {
      for (let r = bottom; r >= top; r--) {
        path.push([r, left]);
        visited[r][left] = true;
      }
      left++;
    }
  }

  return path;
}

const path = generateSpiralPath(size);
console.log(`螺旋路径长度: ${path.length}`);
console.log(`起点: (${path[0][0]}, ${path[0][1]})`);
console.log(`终点: (${path[path.length-1][0]}, ${path[path.length-1][1]})`);

// 检查起点和终点是否相邻
const [sr, sc] = path[0];
const [er, ec] = path[path.length - 1];
const dr = Math.abs(sr - er);
const dc = Math.abs(sc - ec);
console.log(`起点终点距离: dr=${dr}, dc=${dc}`);
console.log(`是否相邻: ${(dr === 1 && dc === 0) || (dr === 0 && dc === 1)}`);

// 打印路径前10个和后10个
console.log(`\n路径前10: ${path.slice(0, 10).map(([r,c]) => `(${r},${c})`).join(' → ')}`);
console.log(`路径后10: ${path.slice(-10).map(([r,c]) => `(${r},${c})`).join(' → ')}`);
