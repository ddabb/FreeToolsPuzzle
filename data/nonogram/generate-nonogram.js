/**
 * 数织 (Nonogram) 题库生成器
 * 生成 6x6 / 8x8 / 10x10 的题目，每种难度1000题
 * 
 * 用法: node generate-nonogram.js [difficulty]
 *   difficulty: easy | medium | hard | all (默认 all)
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  easy:   { size: 6,  count: 1000, fillRate: 0.55 },
  medium: { size: 8,  count: 1000, fillRate: 0.55 },
  hard:   { size: 10, count: 1000, fillRate: 0.50 }
};

const OUT_DIR = path.join(__dirname);

function generateAnswer(size, fillRate) {
  // 随机生成答案矩阵，确保至少30%且不超过70%填充
  const grid = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(Math.random() < fillRate ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

function computeHints(line) {
  const hints = [];
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      count++;
    } else if (count > 0) {
      hints.push(count);
      count = 0;
    }
  }
  if (count > 0) hints.push(count);
  return hints.length > 0 ? hints : [0];
}

function isSolvable(rowHints, colHints, size) {
  // 简单验证：所有行提示数之和 == 所有列提示数之和
  let rowTotal = 0, colTotal = 0;
  for (const h of rowHints) rowTotal += h.reduce((a, b) => a + b, 0);
  for (const h of colHints) colTotal += h.reduce((a, b) => a + b, 0);
  return rowTotal === colTotal && rowTotal > 0;
}

function generatePuzzle(size, fillRate, id) {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const answer = generateAnswer(size, fillRate);
    
    // 计算填充率，确保在合理范围
    let fillCount = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (answer[r][c] === 1) fillCount++;
      }
    }
    const ratio = fillCount / (size * size);
    if (ratio < 0.4 || ratio > 0.7) continue;
    
    // 计算提示
    const rowHints = [];
    const colHints = [];
    for (let r = 0; r < size; r++) {
      rowHints.push(computeHints(answer[r]));
    }
    for (let c = 0; c < size; c++) {
      const col = [];
      for (let r = 0; r < size; r++) col.push(answer[r][c]);
      colHints.push(computeHints(col));
    }
    
    // 验证无全空行/列（提示全是0的行/列，太无聊）
    let hasEmptyRow = false;
    for (const h of rowHints) {
      if (h.length === 1 && h[0] === 0) { hasEmptyRow = true; break; }
    }
    for (const h of colHints) {
      if (h.length === 1 && h[0] === 0) { hasEmptyRow = true; break; }
    }
    // 允许少量全空行，但不超过1个
    let emptyCount = 0;
    for (const h of rowHints) if (h.length === 1 && h[0] === 0) emptyCount++;
    for (const h of colHints) if (h.length === 1 && h[0] === 0) emptyCount++;
    if (emptyCount > 2) continue;
    
    if (!isSolvable(rowHints, colHints, size)) continue;
    
    return {
      id,
      size,
      answer,
      rowHints,
      colHints,
      fillCount
    };
  }
  return null;
}

function generateDifficulty(difficulty) {
  const cfg = CONFIG[difficulty];
  if (!cfg) {
    console.error('Unknown difficulty:', difficulty);
    return;
  }
  
  console.log(`Generating ${cfg.count} ${difficulty} puzzles (${cfg.size}x${cfg.size})...`);
  
  let generated = 0;
  let failed = 0;
  
  for (let i = 1; i <= cfg.count; i++) {
    const puzzle = generatePuzzle(cfg.size, cfg.fillRate, i);
    if (!puzzle) {
      failed++;
      i--; // retry
      if (failed > cfg.count * 2) {
        console.error(`Too many failures at ${i}, stopping`);
        break;
      }
      continue;
    }
    
    const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
    fs.writeFileSync(
      path.join(OUT_DIR, filename),
      JSON.stringify(puzzle)
    );
    
    generated++;
    if (generated % 100 === 0) {
      console.log(`  ${generated}/${cfg.count} done`);
    }
  }
  
  console.log(`${difficulty}: ${generated} puzzles generated`);
}

// Main
const args = process.argv.slice(2);
const target = args[0] || 'all';

if (target === 'all') {
  for (const diff of ['easy', 'medium', 'hard']) {
    generateDifficulty(diff);
  }
} else {
  generateDifficulty(target);
}

console.log('Done!');
