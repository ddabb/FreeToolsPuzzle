const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'one-stroke');

function readAllPuzzles() {
  const puzzles = [];
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(INPUT_DIR, file), 'utf-8');
    const data = JSON.parse(content);
    data.filename = file;
    puzzles.push(data);
  }
  
  return puzzles;
}

function analyzeHoles(puzzle) {
  const { rows, col, holes } = puzzle;
  const cols = col;
  
  if (holes.length < 2) {
    return {
      avgNearestNeighborDist: 0,
      clusteringCoefficient: 0,
      maxClusterSize: holes.length,
      holesCount: holes.length
    };
  }
  
  const holeSet = new Set(holes);
  
  // 1. 平均最近邻距离
  let totalMinDist = 0;
  for (let i = 0; i < holes.length; i++) {
    let minDist = Infinity;
    for (let j = 0; j < holes.length; j++) {
      if (i !== j) {
        const r1 = Math.floor(holes[i] / cols);
        const c1 = holes[i] % cols;
        const r2 = Math.floor(holes[j] / cols);
        const c2 = holes[j] % cols;
        const d = Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2);
        if (d < minDist) minDist = d;
      }
    }
    totalMinDist += minDist;
  }
  const avgNearestNeighborDist = totalMinDist / holes.length;
  
  // 2. 聚集系数
  let totalNeighbors = 0;
  let totalHoleNeighbors = 0;
  
  for (const hole of holes) {
    const r = Math.floor(hole / cols);
    const c = hole % cols;
    
    if (r > 0) { totalNeighbors++; if (holeSet.has(hole - cols)) totalHoleNeighbors++; }
    if (r < rows - 1) { totalNeighbors++; if (holeSet.has(hole + cols)) totalHoleNeighbors++; }
    if (c > 0) { totalNeighbors++; if (holeSet.has(hole - 1)) totalHoleNeighbors++; }
    if (c < cols - 1) { totalNeighbors++; if (holeSet.has(hole + 1)) totalHoleNeighbors++; }
  }
  const clusteringCoefficient = totalNeighbors > 0 ? totalHoleNeighbors / totalNeighbors : 0;
  
  // 3. 最大连续洞区域
  const visited = new Set();
  let maxClusterSize = 0;
  
  for (const hole of holes) {
    if (visited.has(hole)) continue;
    
    const queue = [hole];
    visited.add(hole);
    let clusterSize = 0;
    
    while (queue.length > 0) {
      const current = queue.shift();
      clusterSize++;
      
      const r = Math.floor(current / cols);
      const c = current % cols;
      
      if (r > 0 && holeSet.has(current - cols) && !visited.has(current - cols)) {
        visited.add(current - cols);
        queue.push(current - cols);
      }
      if (r < rows - 1 && holeSet.has(current + cols) && !visited.has(current + cols)) {
        visited.add(current + cols);
        queue.push(current + cols);
      }
      if (c > 0 && holeSet.has(current - 1) && !visited.has(current - 1)) {
        visited.add(current - 1);
        queue.push(current - 1);
      }
      if (c < cols - 1 && holeSet.has(current + 1) && !visited.has(current + 1)) {
        visited.add(current + 1);
        queue.push(current + 1);
      }
    }
    
    if (clusterSize > maxClusterSize) maxClusterSize = clusterSize;
  }
  
  return {
    avgNearestNeighborDist,
    clusteringCoefficient,
    maxClusterSize,
    holesCount: holes.length
  };
}

function main() {
  const puzzles = readAllPuzzles();
  
  if (puzzles.length === 0) {
    console.log('没有找到题目文件');
    return;
  }
  
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('                    洞聚集度分析报告');
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('');
  
  const byDifficulty = {};
  for (const puzzle of puzzles) {
    const diff = puzzle.difficulty;
    if (!byDifficulty[diff]) byDifficulty[diff] = [];
    byDifficulty[diff].push(puzzle);
  }
  
  for (const [diff, diffPuzzles] of Object.entries(byDifficulty)) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━ ${diff.toUpperCase()} 难度 ━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`题目数量: ${diffPuzzles.length}`);
    
    const results = diffPuzzles.map(p => ({
      filename: p.filename,
      ...analyzeHoles(p)
    }));
    
    const avgHoles = results.reduce((sum, r) => sum + r.holesCount, 0) / results.length;
    const avgDist = results.reduce((sum, r) => sum + r.avgNearestNeighborDist, 0) / results.length;
    const avgClustering = results.reduce((sum, r) => sum + r.clusteringCoefficient, 0) / results.length;
    const avgClusterSize = results.reduce((sum, r) => sum + r.maxClusterSize, 0) / results.length;
    
    console.log('');
    console.log('统计摘要:');
    console.log(`  平均洞数: ${avgHoles.toFixed(1)}`);
    console.log(`  平均最近邻距离: ${avgDist.toFixed(2)} (值越大越分散)`);
    console.log(`  平均聚集系数: ${avgClustering.toFixed(2)} (值越大越聚集)`);
    console.log(`  平均最大簇大小: ${avgClusterSize.toFixed(1)}`);
    console.log('');
  }
  
  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('分析说明:');
  console.log('- 平均最近邻距离: 每个洞到最近洞的平均距离，值越大说明洞越分散');
  console.log('- 聚集系数: 洞的相邻格子中也是洞的比例，值越大说明洞越聚集');
  console.log('- 最大簇大小: 最大连续洞区域的格子数');
  console.log('══════════════════════════════════════════════════════════════════════');
}

main();