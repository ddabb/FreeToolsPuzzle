/**
 * 测试 Akari 题目的可解性和唯一解
 */

const fs = require('fs');
const path = require('path');
const { countSolutions, hasUniqueSolution } = require('./akari-solver');

function testPuzzles() {
  const dir = path.join(__dirname, 'akari');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
  
  console.log(`检查 ${files.length} 个题目...\n`);
  
  let validCount = 0;
  let noSolutionCount = 0;
  let multipleSolutionsCount = 0;
  let uniqueSolutionCount = 0;
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const grid = data.grid;
    
    try {
      const solutionCount = countSolutions(grid, 2);
      
      if (solutionCount === 0) {
        console.log(`❌ ${file}: 无解`);
        noSolutionCount++;
      } else if (solutionCount === 1) {
        console.log(`✓ ${file}: 唯一解`);
        uniqueSolutionCount++;
        validCount++;
      } else {
        console.log(`⚠ ${file}: 多个解 (>=2)`);
        multipleSolutionsCount++;
        validCount++;
      }
    } catch (e) {
      console.log(`❌ ${file}: 错误 - ${e.message}`);
      noSolutionCount++;
    }
  }
  
  console.log(`\n========== 总结 ==========`);
  console.log(`总题目数: ${files.length}`);
  console.log(`有解: ${validCount} (${(validCount/files.length*100).toFixed(1)}%)`);
  console.log(`唯一解: ${uniqueSolutionCount} (${(uniqueSolutionCount/files.length*100).toFixed(1)}%)`);
  console.log(`多个解: ${multipleSolutionsCount} (${(multipleSolutionsCount/files.length*100).toFixed(1)}%)`);
  console.log(`无解: ${noSolutionCount} (${(noSolutionCount/files.length*100).toFixed(1)}%)`);
}

testPuzzles();
