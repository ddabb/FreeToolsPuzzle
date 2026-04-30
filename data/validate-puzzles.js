const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'one-stroke');

function validateAnswer(rows, cols, holes, answer) {
  const total = rows * cols;
  const holeSet = new Set(holes);
  const validCount = total - holes.length;

  if (answer.length !== validCount) {
    return { valid: false, reason: `路径长度不对: 期望 ${validCount}, 实际 ${answer.length}` };
  }

  const visited = new Set();
  
  for (let i = 0; i < answer.length; i++) {
    const cell = answer[i];
    
    if (visited.has(cell)) {
      return { valid: false, reason: `重复访问格子: ${cell}` };
    }
    
    if (holeSet.has(cell)) {
      return { valid: false, reason: `路径经过洞: ${cell}` };
    }
    
    visited.add(cell);
    
    if (i > 0) {
      const prev = answer[i - 1];
      const prevR = Math.floor(prev / cols);
      const prevC = prev % cols;
      const currR = Math.floor(cell / cols);
      const currC = cell % cols;
      
      const dr = Math.abs(prevR - currR);
      const dc = Math.abs(prevC - currC);
      
      if (dr + dc !== 1) {
        return { valid: false, reason: `步骤 ${i} 移动不合法: ${prev} -> ${cell}` };
      }
    }
  }

  if (visited.size !== validCount) {
    return { valid: false, reason: `访问的格子数不对: 期望 ${validCount}, 实际 ${visited.size}` };
  }

  return { valid: true, reason: '正确' };
}

function main() {
  console.log('开始验证 one-stroke 题目...\n');

  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('没有找到题目文件');
    return;
  }

  let totalValid = 0;
  let totalInvalid = 0;
  let totalFiles = 0;

  const byDifficulty = {};

  for (const file of files) {
    const content = fs.readFileSync(path.join(INPUT_DIR, file), 'utf-8');
    const data = JSON.parse(content);
    
    const difficulty = data.difficulty;
    if (!byDifficulty[difficulty]) {
      byDifficulty[difficulty] = { valid: 0, invalid: 0 };
    }

    const result = validateAnswer(data.row, data.col, data.holes, data.answer);

    if (result.valid) {
      byDifficulty[difficulty].valid++;
      totalValid++;
    } else {
      byDifficulty[difficulty].invalid++;
      totalInvalid++;
      console.log(`❌ 无效题目: ${file} - ${result.reason}`);
    }
    
    totalFiles++;
    
    if (totalFiles % 500 === 0) {
      console.log(`已验证: ${totalFiles}/${files.length}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('                          验证结果');
  console.log('══════════════════════════════════════════════════════════════════════');
  
  for (const [diff, stats] of Object.entries(byDifficulty)) {
    const total = stats.valid + stats.invalid;
    const rate = ((stats.valid / total) * 100).toFixed(1);
    console.log(`\n${diff.toUpperCase()} 难度:`);
    console.log(`  总数: ${total}`);
    console.log(`  有效: ${stats.valid} (${rate}%)`);
    console.log(`  无效: ${stats.invalid}`);
  }

  console.log('\n──────────────────────────────────────────────────────────────────────');
  const overallRate = ((totalValid / totalFiles) * 100).toFixed(1);
  console.log(`总计:`);
  console.log(`  题目总数: ${totalFiles}`);
  console.log(`  有效题目: ${totalValid} (${overallRate}%)`);
  console.log(`  无效题目: ${totalInvalid}`);
  console.log('══════════════════════════════════════════════════════════════════════');
}

main();