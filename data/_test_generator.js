/**
 * 快速测试新生成器
 */

const path = require('path');
const generatorPath = path.join(__dirname, 'generate-one-stroke-new.js');

// 修改配置只生成少量测试题
const fs = require('fs');
const code = fs.readFileSync(generatorPath, 'utf8');

// 替换配置：每个难度只生成5个
const testConfig = `const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 2, maxHoles: 8, count: 5 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 15, count: 5 },
  hard: { rows: 10, cols: 10, minHoles: 6, maxHoles: 25, count: 5 }
};`;

const modified = code.replace(/const DIFFICULTIES = \{[^}]+\};/s, testConfig);

// 执行修改后的代码
eval(modified);