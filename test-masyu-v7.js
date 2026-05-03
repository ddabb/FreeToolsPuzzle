const size = 6;
const total = size * size;
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const OPP = [2, 3, 0, 1];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateHamiltonianCycle(sz) {
  const tot = sz * sz;
  const path = new Array(tot);
  const visited = Array.from({ length: sz }, () => Array(sz).fill(false));
  const startR = Math.floor(Math.random() * sz);
  const startC = Math.floor(Math.random() * sz);
  path[0] = [startR, startC];
  visited[startR][startC] = true;
  let found = false;

  function dfs(idx) {
    if (idx === tot) {
      const [r, c] = path[idx - 1];
      const dr = Math.abs(r - startR);
      const dc = Math.abs(c - startC);
      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) { found = true; }
      return;
    }
    const [r, c] = path[idx - 1];
    const dirs = shuffle([0, 1, 2, 3]);
    const candidates = [];
    for (const d of dirs) {
      const nr = r + DR[d], nc = c + DC[d];
      if (nr >= 0 && nr < sz && nc >= 0 && nc < sz && !visited[nr][nc]) {
        let exits = 0;
        for (let dd = 0; dd < 4; dd++) {
          if (dd === OPP[d]) continue;
          const nnr = nr + DR[dd], nnc = nc + DC[dd];
          if (nnr >= 0 && nnr < sz && nnc >= 0 && nnc < sz && !visited[nnr][nnc]) exits++;
        }
        if (idx === tot - 1) {
          const dr2 = Math.abs(nr - startR), dc2 = Math.abs(nc - startC);
          if (!((dr2 === 1 && dc2 === 0) || (dr2 === 0 && dc2 === 1))) continue;
        }
        candidates.push({ d, nr, nc, exits });
      }
    }
    candidates.sort((a, b) => (a.exits + Math.random() * 0.5) - (b.exits + Math.random() * 0.5));
    for (const { d, nr, nc } of candidates) {
      visited[nr][nc] = true;
      path[idx] = [nr, nc];
      dfs(idx + 1);
      if (found) return;
      visited[nr][nc] = false;
    }
  }
  dfs(1);
  return found ? path : null;
}

// Test 6x6
let ok6 = 0, fail6 = 0;
const s6 = Date.now();
for (let i = 0; i < 10; i++) {
  if (generateHamiltonianCycle(6)) ok6++; else fail6++;
}
console.log('6x6: ok=' + ok6 + ' fail=' + fail6 + ' time=' + ((Date.now()-s6)/1000).toFixed(1) + 's');

// Test 8x8
let ok8 = 0, fail8 = 0;
const s8 = Date.now();
for (let i = 0; i < 3; i++) {
  if (generateHamiltonianCycle(8)) ok8++; else fail8++;
}
console.log('8x8: ok=' + ok8 + ' fail=' + fail8 + ' time=' + ((Date.now()-s8)/1000).toFixed(1) + 's');
