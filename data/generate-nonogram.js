/**
 * 数织谜题批量生成 - 每个谜题单独文件
 */

const fs = require('fs');
const path = require('path');

function seededRand(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function calcHints(line) {
  const h = [];
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i]) { count++; }
    else if (count) { h.push(count), count = 0; }
  }
  if (count) h.push(count);
  return h.length ? h : [0];
}

function verifyPuzzle(answer, size) {
  for (let r = 0; r < size; r++) {
    const sum = answer[r].reduce((a, b) => a + b, 0);
    if (sum === 0 || sum === size) return false;
  }
  for (let c = 0; c < size; c++) {
    let sum = 0;
    for (let r = 0; r < size; r++) sum += answer[r][c];
    if (sum === 0 || sum === size) return false;
  }
  return true;
}

function generatePuzzle(size, seed) {
  const rand = seededRand(seed);
  for (let attempt = 0; attempt < 100; attempt++) {
    const density = 0.4 + (attempt % 20) * 0.015;
    const answer = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => rand() < density ? 1 : 0)
    );
    if (!verifyPuzzle(answer, size)) continue;
    const rowHints = answer.map(row => calcHints(row));
    const colHints = Array.from({ length: size }, (_, c) => 
      calcHints(answer.map(r => r[c]))
    );
    return { answer, rowHints, colHints };
  }
  return null;
}

function main() {
  const outputDir = path.join(__dirname, 'nonogram');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const difficulties = [
    { name: 'easy', size: 5 },
    { name: 'medium', size: 8 },
    { name: 'hard', size: 10 }
  ];
  
  const countPerDiff = 1000;
  let total = 0;
  const startTime = Date.now();
  const failed = [];

  for (const { name, size } of difficulties) {
    console.log(`生成 ${name} (${size}×${size})...`);
    
    for (let i = 1; i <= countPerDiff;) {
      const seed = i * 99991 + size * 7777;
      const puzzle = generatePuzzle(size, seed);
      
      if (puzzle) {
        const item = {
          id: i,
          size,
          answer: puzzle.answer,
          rowHints: puzzle.rowHints,
          colHints: puzzle.colHints,
          fillCount: puzzle.answer.flat().filter(v => v === 1).length
        };
        
        // 每个谜题单独一个文件
        const filename = `${name}-${String(i).padStart(4, '0')}.json`;
        fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(item));
        
        total++;
        process.stdout.write(`  ✓ ${filename}\r`);
        i++;
      } else {
        failed.push({ difficulty: name, id: i, size });
        console.log(`  ⚠️ ${name}-${i} 失败，已记录`);
        i++; // 跳过，继续下一个
      }
    }
    console.log(`  ✓ ${name} 完成`);
  }

  // 保存失败记录
  if (failed.length) {
    fs.writeFileSync(path.join(outputDir, 'failed.json'), JSON.stringify(failed, null, 2));
    console.log(`\n⚠️ 失败记录: ${failed.length} 个`);
  }

  // 保存索引
  const index = {
    total,
    difficulties: difficulties.map(d => d.name),
    generatedAt: new Date().toISOString(),
    files: fs.readdirSync(outputDir).filter(f => f.endsWith('.json') && f !== 'failed.json').sort()
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));

  console.log(`\n完成! 总计 ${total} 个谜题, 耗时 ${Math.round((Date.now() - startTime) / 1000)}秒`);
}

main();
