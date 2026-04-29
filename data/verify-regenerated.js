/**
 * 验证重新生成的扫雷题目
 */

const fs = require('fs');
const path = require('path');
const validateMinesweeper = require('./validators/minesweeper');

function verifyRegeneratedPuzzles() {
  const gameDir = path.join(__dirname, 'minesweeper');
  
  const invalidFiles = [
    'easy-0235.json', 'easy-0243.json', 'easy-0908.json',
    'hard-0030.json', 'hard-0064.json', 'hard-0102.json', 'hard-0115.json',
    'hard-0120.json', 'hard-0175.json', 'hard-0229.json', 'hard-0263.json',
    'hard-0268.json', 'hard-0278.json', 'hard-0291.json', 'hard-0352.json',
    'hard-0398.json', 'hard-0423.json', 'hard-0424.json', 'hard-0429.json',
    'hard-0433.json', 'hard-0436.json', 'hard-0452.json', 'hard-0457.json',
    'hard-0472.json', 'hard-0522.json', 'hard-0547.json', 'hard-0565.json',
    'hard-0572.json', 'hard-0580.json', 'hard-0612.json', 'hard-0613.json',
    'hard-0659.json', 'hard-0682.json', 'hard-0690.json', 'hard-0692.json',
    'hard-0698.json', 'hard-0737.json', 'hard-0742.json', 'hard-0744.json',
    'hard-0782.json', 'hard-0803.json', 'hard-0810.json', 'hard-0833.json',
    'hard-0858.json', 'hard-0859.json', 'hard-0895.json', 'hard-0914.json',
    'hard-0916.json', 'hard-0918.json', 'hard-0963.json',
    'medium-0064.json', 'medium-0195.json', 'medium-0238.json', 'medium-0348.json',
    'medium-0355.json', 'medium-0384.json', 'medium-0422.json', 'medium-0488.json',
    'medium-0493.json', 'medium-0494.json', 'medium-0504.json', 'medium-0549.json',
    'medium-0586.json', 'medium-0759.json', 'medium-0766.json', 'medium-0922.json',
    'medium-0973.json'
  ];

  console.log('验证重新生成的扫雷题目...');
  console.log('共 ' + invalidFiles.length + ' 个题目需要验证');

  let validCount = 0;
  let invalidCount = 0;

  for (const file of invalidFiles) {
    const filePath = path.join(gameDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const puzzle = JSON.parse(content);

    if (validateMinesweeper(puzzle)) {
      validCount++;
      console.log('✓ ' + file + ' - 通过');
    } else {
      invalidCount++;
      console.log('✗ ' + file + ' - 仍然无效');
    }
  }

  console.log('\n=== 验证结果 ===');
  console.log('通过: ' + validCount);
  console.log('无效: ' + invalidCount);
}

verifyRegeneratedPuzzles();