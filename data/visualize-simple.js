// -*- coding: utf-8 -*-
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, 'one-stroke');

function visualizePuzzle(data) {
  const { row, col, holes, answer, difficulty, id } = data;

  const holeSet = new Set(holes);
  const answerMap = new Map();
  for (let i = 0; i < answer.length; i++) {
    const cell = answer[i];
    answerMap.set(cell, i + 1);
  }

  console.log(`题目: ${difficulty}-${String(id).padStart(4, '0')}`);
  console.log(`网格: ${row}x${col}, 洞数: ${holes.length}, 步数: ${answer.length}`);
  console.log('');

  const line1 = '═'.repeat(col * 5 + 1);
  console.log(line1);

  for (let r = 0; r < row; r++) {
    let line = '║';
    for (let c = 0; c < col; c++) {
      const cell = r * col + c;
      if (holeSet.has(cell)) {
        line += '██║';
      } else if (answerMap.has(cell)) {
        const num = answerMap.get(cell);
        line += num.toString().padStart(2, '0') + '║';
      } else {
        line += '..║';
      }
    }
    console.log(line);
    console.log(line1);
  }

  console.log('');
  console.log('图例: ██ = 洞, .. = 未访问空格, 数字 = 路径顺序');
  console.log(`起点: ${answer[0]}, 终点: ${answer[answer.length - 1]}`);
  console.log('');
}

const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
const randomFile = files[Math.floor(Math.random() * files.length)];
const filepath = path.join(INPUT_DIR, randomFile);
const content = fs.readFileSync(filepath, 'utf-8');
const data = JSON.parse(content);

visualizePuzzle(data);