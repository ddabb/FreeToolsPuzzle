/**
 * 分析多解题目的特征
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = 'f:/SelfJob/freetoolspuzzle/data/tents/hard';

const multiFiles = [
  'hard-0002.json', 'hard-0016.json', 'hard-0019.json', 'hard-0036.json', 'hard-0077.json',
  'hard-0094.json', 'hard-0127.json', 'hard-0133.json', 'hard-0166.json', 'hard-0171.json',
  'hard-0207.json', 'hard-0243.json', 'hard-0253.json', 'hard-0261.json', 'hard-0289.json',
  'hard-0304.json', 'hard-0308.json', 'hard-0316.json', 'hard-0347.json', 'hard-0363.json',
  'hard-0371.json', 'hard-0394.json', 'hard-0419.json', 'hard-0424.json', 'hard-0431.json',
  'hard-0453.json', 'hard-0457.json', 'hard-0460.json', 'hard-0509.json', 'hard-0511.json',
  'hard-0516.json', 'hard-0560.json', 'hard-0565.json', 'hard-0585.json', 'hard-0587.json',
  'hard-0593.json', 'hard-0638.json', 'hard-0656.json', 'hard-0665.json', 'hard-0680.json',
  'hard-0712.json', 'hard-0767.json', 'hard-0775.json', 'hard-0780.json', 'hard-0790.json',
  'hard-0800.json', 'hard-0825.json', 'hard-0832.json', 'hard-0906.json', 'hard-0911.json',
  'hard-0916.json', 'hard-0930.json', 'hard-0932.json', 'hard-0949.json', 'hard-0976.json',
  'hard-0985.json', 'hard-0998.json'
];

console.log('多解题目的树数量分布:\n');

const treeCountDist = {};
for (const filename of multiFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8'));
  const treeCount = data.treeCount;
  treeCountDist[treeCount] = (treeCountDist[treeCount] || 0) + 1;
}

const sortedCounts = Object.keys(treeCountDist).map(Number).sort((a, b) => a - b);
for (const count of sortedCounts) {
  console.log(`树数量 ${count}: ${treeCountDist[count]} 个题目`);
}

console.log('\n注意: 树数量越多，约束越强，唯一解概率越高');
console.log('当前多解题目的树数量都在5棵，太少了');