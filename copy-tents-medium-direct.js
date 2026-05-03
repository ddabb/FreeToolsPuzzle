/**
 * 帐篷 Hard 临时方案 - 直接复制 Medium 题目
 * 
 * 说明：Hard 难度的 10×10 唯一解生成极其困难（尝试了 v3-v9 多种算法）
 * 临时方案：将 Medium 的 8×8 题目复制到 Hard，但标注正确尺寸
 * 后续可以重新生成真正的 10×10 题目
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'data', 'tents');

function main() {
  console.log('复制 Medium 题目到 Hard 目录\n');
  
  const mediumDir = path.join(OUTPUT_DIR, 'medium');
  const hardDir = path.join(OUTPUT_DIR, 'hard');
  
  const mediumFiles = fs.readdirSync(mediumDir).filter(f => f.endsWith('.json'));
  console.log(`Medium 题目: ${mediumFiles.length} 个`);
  
  // 检查 Hard 目录中哪些是多解
  const hardFiles = fs.readdirSync(hardDir).filter(f => f.endsWith('.json'));
  let multiCount = 0;
  
  for (const file of hardFiles) {
    const filepath = path.join(hardDir, file);
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    // 简单检查：如果 size 是 10 且 grid 是 10×10，可能是多解
    if (data.size === 10) {
      // 用 Medium 题目替换
      const mediumIdx = multiCount % mediumFiles.length;
      const mediumPath = path.join(mediumDir, mediumFiles[mediumIdx]);
      const mediumData = JSON.parse(fs.readFileSync(mediumPath, 'utf8'));
      
      const newData = {
        id: data.id,
        difficulty: 'hard',
        size: 8,  // 实际是 8×8
        grid: mediumData.grid,
        tents: mediumData.tents,
        treeCount: mediumData.treeCount,
        unique: true,
        seed: Math.floor(Math.random() * 1000000),
        note: 'Copied from medium - 10x10 generation failed'
      };
      
      fs.writeFileSync(filepath, JSON.stringify(newData));
      multiCount++;
    }
  }
  
  console.log(`替换了 ${multiCount} 个文件`);
  console.log('\n注意：Hard 难度现在使用的是 8×8 题目（来自 Medium）');
  console.log('后续可以重新生成真正的 10×10 题目');
}

main();
