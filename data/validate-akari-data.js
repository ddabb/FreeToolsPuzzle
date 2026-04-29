/**
 * 验证 Akari 数据的合理性
 */

const fs = require('fs');
const path = require('path');

function validatePuzzle(data, filename) {
  const grid = data.grid;
  const rows = data.size || grid.length;
  const cols = grid[0].length;
  
  let errors = [];
  let warnings = [];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell !== ' ' && cell !== undefined) {
        const num = parseInt(cell);
        if (isNaN(num) || num < 0 || num > 4) {
          errors.push(`(${r},${c}): 无效数字 ${cell}`);
          continue;
        }
        
        // 计算四周的白格数量
        let whiteCount = 0;
        const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for (const [ar, ac] of adj) {
          if (ar >= 0 && ar < rows && ac >= 0 && ac < cols) {
            if (grid[ar][ac] === ' ') whiteCount++;
          }
        }
        
        if (num > whiteCount) {
          errors.push(`(${r},${c}): 数字 ${num} 超过四周白格数 ${whiteCount}`);
        }
      }
    }
  }
  
  return { errors, warnings };
}

function main() {
  const dir = path.join(__dirname, 'akari');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
  
  console.log(`验证 ${files.length} 个题目...\n`);
  
  let totalErrors = 0;
  let filesWithErrors = 0;
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const { errors, warnings } = validatePuzzle(data, file);
    
    if (errors.length > 0) {
      console.log(`❌ ${file}:`);
      errors.forEach(e => console.log(`   ${e}`));
      totalErrors += errors.length;
      filesWithErrors++;
    }
    
    if (warnings.length > 0) {
      console.log(`⚠ ${file}:`);
      warnings.forEach(w => console.log(`   ${w}`));
    }
  }
  
  console.log(`\n========== 总结 ==========`);
  console.log(`总题目数: ${files.length}`);
  console.log(`有错误的题目: ${filesWithErrors} (${(filesWithErrors/files.length*100).toFixed(1)}%)`);
  console.log(`总错误数: ${totalErrors}`);
}

main();
