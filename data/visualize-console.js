/**
 * ============================================================================
 * 一笔画题目可视化工具
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'one-stroke');

function visualizePuzzle(data) {
  const { row, col, holes, answer } = data;
  const total = row * col;

  const holeSet = new Set(holes);
  const answerMap = new Map();
  answer.forEach((cell, index) => {
    answerMap.set(cell, index + 1);
  });

  console.log(`\n题目: ${data.difficulty}-${String(data.id).padStart(4, '0')}`);
  console.log(`网格: ${row}x${col}, 洞数: ${holes.length}, 步数: ${answer.length}`);
  console.log('\n' + '═'.repeat(col * 4 + 1));

  for (let r = 0; r < row; r++) {
    let line = '║';
    for (let c = 0; c < col; c++) {
      const cell = r * col + c;
      if (holeSet.has(cell)) {
        line += ' ██ ║';
      } else if (answerMap.has(cell)) {
        const num = answerMap.get(cell);
        const step = num.toString().padStart(2, '0');
        line += `${step}║`;
      } else {
        line += ' .. ║';
      }
    }
    console.log(line);
    console.log('═'.repeat(col * 4 + 1));
  }

  console.log('\n图例: ██ = 洞, .. = 未访问空格, 数字 = 路径顺序');
  console.log(`起点: ${answer[0]}, 终点: ${answer[answer.length - 1]}`);
  console.log('');
}

function main() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('没有找到题目文件');
    return;
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const filepath = path.join(INPUT_DIR, randomFile);
  const content = fs.readFileSync(filepath, 'utf-8');
  const data = JSON.parse(content);

  visualizePuzzle(data);

  console.log('显示另一道题目? (y/n)');
}

main();