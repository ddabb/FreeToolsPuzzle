const puzzle = require('./easy/easy-0066.json');
const path = puzzle.path;
const dotSize = puzzle.dotSize;

// 格点索引转坐标
const idxToCoord = (idx) => ({ r: Math.floor(idx / dotSize), c: idx % dotSize });

console.log('Path length:', path.length);
console.log('Dot size:', dotSize);
console.log('');

// 检查白珠 (3,0)
const white1 = { r: 3, c: 0 };
const white1Idx = white1.r * dotSize + white1.c;
console.log('White pearl 1 at (3,0), idx:', white1Idx);

const pos1 = path.indexOf(white1Idx);
console.log('Position in path:', pos1);

if (pos1 >= 0) {
  const prevIdx = path[(pos1 - 1 + path.length) % path.length];
  const nextIdx = path[(pos1 + 1) % path.length];
  const prev = idxToCoord(prevIdx);
  const next = idxToCoord(nextIdx);

  console.log('Prev:', prev, 'idx:', prevIdx);
  console.log('Next:', next, 'idx:', nextIdx);

  const isStraight = (prev.r === next.r) || (prev.c === next.c);
  console.log('Is straight:', isStraight);

  const dir1 = { r: white1.r - prev.r, c: white1.c - prev.c };
  const dir2 = { r: next.r - white1.r, c: next.c - white1.c };
  console.log('Direction from prev to white:', dir1);
  console.log('Direction from white to next:', dir2);

  // 向前延伸（沿着dir1反方向）
  let forwardCount = 0;
  let currR = white1.r + dir1.r;
  let currC = white1.c + dir1.c;
  while (currR >= 0 && currR < dotSize && currC >= 0 && currC < dotSize) {
    const currIdx = currR * dotSize + currC;
    if (path.includes(currIdx)) {
      forwardCount++;
      currR += dir1.r;
      currC += dir1.c;
    } else {
      break;
    }
  }

  // 向后延伸（沿着dir2方向）
  let backwardCount = 0;
  currR = white1.r + dir2.r;
  currC = white1.c + dir2.c;
  while (currR >= 0 && currR < dotSize && currC >= 0 && currC < dotSize) {
    const currIdx = currR * dotSize + currC;
    if (path.includes(currIdx)) {
      backwardCount++;
      currR += dir2.r;
      currC += dir2.c;
    } else {
      break;
    }
  }

  console.log('Forward extension:', forwardCount);
  console.log('Backward extension:', backwardCount);
  console.log('White pearl rule (>=2):', forwardCount >= 2 && backwardCount >= 2);
}

console.log('');

// 检查白珠 (6,2)
const white2 = { r: 6, c: 2 };
const white2Idx = white2.r * dotSize + white2.c;
console.log('White pearl 2 at (6,2), idx:', white2Idx);

const pos2 = path.indexOf(white2Idx);
console.log('Position in path:', pos2);

if (pos2 >= 0) {
  const prevIdx = path[(pos2 - 1 + path.length) % path.length];
  const nextIdx = path[(pos2 + 1) % path.length];
  const prev = idxToCoord(prevIdx);
  const next = idxToCoord(nextIdx);

  console.log('Prev:', prev, 'idx:', prevIdx);
  console.log('Next:', next, 'idx:', nextIdx);

  const isStraight = (prev.r === next.r) || (prev.c === next.c);
  console.log('Is straight:', isStraight);

  const dir1 = { r: white2.r - prev.r, c: white2.c - prev.c };
  const dir2 = { r: next.r - white2.r, c: next.c - white2.c };
  console.log('Direction from prev to white:', dir1);
  console.log('Direction from white to next:', dir2);

  let forwardCount = 0;
  let currR = white2.r + dir1.r;
  let currC = white2.c + dir1.c;
  while (currR >= 0 && currR < dotSize && currC >= 0 && currC < dotSize) {
    const currIdx = currR * dotSize + currC;
    if (path.includes(currIdx)) {
      forwardCount++;
      currR += dir1.r;
      currC += dir1.c;
    } else {
      break;
    }
  }

  let backwardCount = 0;
  currR = white2.r + dir2.r;
  currC = white2.c + dir2.c;
  while (currR >= 0 && currR < dotSize && currC >= 0 && currC < dotSize) {
    const currIdx = currR * dotSize + currC;
    if (path.includes(currIdx)) {
      backwardCount++;
      currR += dir2.r;
      currC += dir2.c;
    } else {
      break;
    }
  }

  console.log('Forward extension:', forwardCount);
  console.log('Backward extension:', backwardCount);
  console.log('White pearl rule (>=2):', forwardCount >= 2 && backwardCount >= 2);
}
