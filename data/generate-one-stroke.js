/**
 * 批量生成 one-stroke（一笔画）题目
 * 难度配置：
 *   easy: 4x4 网格，洞数量 1-4
 *   medium: 5x5 网格，洞数量 2-6  
 *   hard: 6x6 网格，洞数量 3-8
 * 
 * 使用方法: node generate-one-stroke.js
 */

const fs = require('fs');
const path = require('path');
const GridPathFinder = require('../packages/math/utils/GridPathFinder');

// 难度配置
const DIFFICULTIES = {
  easy: { rows: 6, cols: 6, minHoles: 2, maxHoles: 8, count: 1000 },
  medium: { rows: 8, cols: 8, minHoles: 4, maxHoles: 15, count: 1000 },
  hard: { rows: 10, cols: 10, minHoles: 6, maxHoles: 25, count: 1000 }
};

// 输出目录
const OUTPUT_DIR = path.join(__dirname, 'one-stroke');

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 生成单个题目
function generatePuzzle(rows, cols, minHoles, maxHoles) {
  const totalCells = rows * cols;
  const maxHoleCount = Math.floor(totalCells * 0.35); // 最多35%的洞
  
  // 尝试不同洞数量，找到有效的
  for (let holeCount = minHoles; holeCount <= Math.min(maxHoles, maxHoleCount); holeCount++) {
    // 尝试多次生成
    for (let attempt = 0; attempt < 100; attempt++) {
      const holes = generateRandomHoles(rows, cols, holeCount);
      const verifier = new GridPathFinder(rows, cols, holes);
      
      if (verifier.isOneStroke()) {
        return { holes, row: rows, col: cols };
      }
    }
  }
  
  // 兜底：使用内置生成器
  const holes = GridPathFinder.generateValidPuzzle(rows, cols, 0.3);
  return { holes, row: rows, col: cols };
}

// 生成随机洞（只选内部格子，增加复杂度）
function generateRandomHoles(rows, cols, count) {
  const holes = new Set();
  
  // 内部格子列表（边缘格子通常会让题目变简单）
  const innerCells = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      innerCells.push(r * cols + c);
    }
  }
  
  // 随机打乱
  for (let i = innerCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [innerCells[i], innerCells[j]] = [innerCells[j], innerCells[i]];
  }
  
  // 选取洞（确保不会太多内部格子被挖掉导致无解）
  let added = 0;
  for (const cell of innerCells) {
    if (added >= count) break;
    
    const testHoles = [...holes, cell];
    const verifier = new GridPathFinder(rows, cols, testHoles);
    
    if (verifier.isOneStroke()) {
      holes.add(cell);
      added++;
    }
  }
  
  // 如果内部格子不够，从边缘补充
  if (holes.size < count) {
    const edgeCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          edgeCells.push(r * cols + c);
        }
      }
    }
    
    for (const cell of edgeCells) {
      if (holes.size >= count) break;
      if (!holes.has(cell)) {
        const testHoles = [...holes, cell];
        const verifier = new GridPathFinder(rows, cols, testHoles);
        if (verifier.isOneStroke()) {
          holes.add(cell);
        }
      }
    }
  }
  
  return Array.from(holes);
}

// 批量生成
function generateAll() {
  console.log('开始生成 one-stroke 题目...\n');
  
  ensureDir(OUTPUT_DIR);
  
  let total = 0;
  
  for (const [difficulty, config] of Object.entries(DIFFICULTIES)) {
    console.log(`生成 ${difficulty} 难度 (${config.rows}x${config.cols})...`);
    
    let success = 0;
    let fail = 0;
    
    for (let i = 1; i <= config.count; i++) {
      const puzzle = generatePuzzle(
        config.rows, 
        config.cols, 
        config.minHoles, 
        config.maxHoles
      );
      
      if (puzzle.holes && puzzle.holes.length > 0) {
        const filename = `${difficulty}-${String(i).padStart(4, '0')}.json`;
        const filepath = path.join(OUTPUT_DIR, filename);
        
        const data = {
          size: config.rows,
          row: config.rows,
          col: config.cols,
          holes: puzzle.holes,
          difficulty: difficulty,
          id: i
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        success++;
        
        if (success % 10 === 0) {
          process.stdout.write(`${success} `);
        }
      } else {
        fail++;
      }
    }
    
    console.log(`\n  成功: ${success}, 失败: ${fail}\n`);
    total += success;
  }
  
  console.log(`完成！共生成 ${total} 个题目`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
}

// 运行
generateAll();
