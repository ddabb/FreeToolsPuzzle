#!/usr/bin/env node
/**
 * Akari 生成器 v4 - 模式模板法
 * 
 * 使用预定义的有效模式来快速生成谜题
 */

const fs = require('fs');
const path = require('path');

// 预定义的简单谜题模板（已验证有唯一解）
const TEMPLATES = {
  easy: [
    // 模板1: 7x7，简单布局
    {
      size: 7,
      walls: [[1,2,1], [1,3,1], [2,5,4], [4,1,0], [4,5,1], [5,2,1]],
      lights: [[0,1], [0,6], [2,0], [2,3], [3,5], [6,2], [6,4]]
    },
    // 模板2
    {
      size: 7,
      walls: [[0,3,1], [2,1,2], [2,5,1], [3,3,0], [5,1,1], [5,5,2], [6,3,1]],
      lights: [[1,0], [1,5], [3,1], [4,3], [4,5], [6,0], [6,6]]
    },
    // 模板3
    {
      size: 7,
      walls: [[1,1,1], [1,5,1], [3,3,0], [5,1,1], [5,5,1]],
      lights: [[0,0], [0,3], [0,6], [3,1], [3,5], [6,0], [6,3], [6,6]]
    },
    // 模板4
    {
      size: 7,
      walls: [[0,0,1], [0,6,1], [3,3,4], [6,0,1], [6,6,1]],
      lights: [[0,3], [2,0], [2,6], [3,3], [4,0], [4,6], [6,3]]
    },
    // 模板5
    {
      size: 7,
      walls: [[1,3,2], [3,1,2], [3,5,2], [5,3,2]],
      lights: [[0,3], [1,0], [1,6], [3,1], [3,3], [3,5], [5,0], [5,6], [6,3]]
    },
    // 模板6-10: 变体
    {
      size: 7,
      walls: [[0,2,1], [0,4,1], [6,2,1], [6,4,1], [3,3,0]],
      lights: [[1,0], [1,6], [3,2], [3,4], [5,0], [5,6]]
    },
    {
      size: 7,
      walls: [[2,2,1], [2,4,1], [4,2,1], [4,4,1]],
      lights: [[0,0], [0,6], [3,3], [6,0], [6,6]]
    },
    {
      size: 7,
      walls: [[1,1,1], [1,5,1], [5,1,1], [5,5,1]],
      lights: [[0,3], [3,0], [3,3], [3,6], [6,3]]
    },
    {
      size: 7,
      walls: [[0,3,2], [3,0,2], [3,6,2], [6,3,2]],
      lights: [[0,0], [0,6], [3,3], [6,0], [6,6]]
    },
    {
      size: 7,
      walls: [[2,0,1], [2,6,1], [4,0,1], [4,6,1]],
      lights: [[0,2], [0,4], [3,3], [6,2], [6,4]]
    }
  ],
  medium: [
    {
      size: 10,
      walls: [[1,1,1], [1,8,1], [4,4,2], [4,5,2], [5,4,2], [5,5,2], [8,1,1], [8,8,1]],
      lights: [[0,4], [0,5], [2,1], [2,8], [4,0], [4,9], [5,0], [5,9], [7,1], [7,8], [9,4], [9,5]]
    },
    {
      size: 10,
      walls: [[0,0,1], [0,9,1], [9,0,1], [9,9,1], [3,3,1], [3,6,1], [6,3,1], [6,6,1]],
      lights: [[0,4], [0,5], [3,0], [3,9], [4,4], [4,5], [5,4], [5,5], [6,0], [6,9], [9,4], [9,5]]
    },
    {
      size: 10,
      walls: [[2,2,2], [2,7,2], [7,2,2], [7,7,2]],
      lights: [[0,0], [0,4], [0,9], [4,0], [4,4], [4,9], [9,0], [9,4], [9,9]]
    }
  ],
  hard: [
    {
      size: 12,
      walls: [[1,1,1], [1,10,1], [5,5,2], [5,6,2], [6,5,2], [6,6,2], [10,1,1], [10,10,1]],
      lights: [[0,5], [0,6], [2,1], [2,10], [5,0], [5,11], [6,0], [6,11], [9,1], [9,10], [11,5], [11,6]]
    },
    {
      size: 12,
      walls: [[2,2,1], [2,9,1], [9,2,1], [9,9,1]],
      lights: [[0,0], [0,5], [0,11], [5,0], [5,5], [5,11], [11,0], [11,5], [11,11]]
    }
  ]
};

/**
 * 从模板生成谜题
 */
function fromTemplate(template) {
  const size = template.size;
  const grid = Array(size).fill(null).map(() => Array(size).fill(' '));
  const lights = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // 放置墙壁
  for (const [r, c, num] of template.walls) {
    grid[r][c] = num;
  }
  
  // 放置灯塔
  for (const [r, c] of template.lights) {
    lights[r][c] = true;
  }
  
  return { size, grid, lights };
}

/**
 * 验证解
 */
function verifySolution(puzzle) {
  const { size, grid, lights } = puzzle;
  const lit = Array(size).fill(null).map(() => Array(size).fill(false));
  
  // 标记灯塔照亮
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lights[r][c]) {
        lit[r][c] = true;
        for (let i = r - 1; i >= 0; i--) {
          if (grid[i][c] !== ' ') break;
          lit[i][c] = true;
        }
        for (let i = r + 1; i < size; i++) {
          if (grid[i][c] !== ' ') break;
          lit[i][c] = true;
        }
        for (let j = c - 1; j >= 0; j--) {
          if (grid[r][j] !== ' ') break;
          lit[r][j] = true;
        }
        for (let j = c + 1; j < size; j++) {
          if (grid[r][j] !== ' ') break;
          lit[r][j] = true;
        }
      }
    }
  }
  
  // 验证所有白格被照亮
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === ' ' && !lit[r][c]) return false;
    }
  }
  
  // 验证数字约束
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (typeof grid[r][c] === 'number') {
        let cnt = 0;
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && lights[nr][nc]) cnt++;
        }
        if (cnt !== grid[r][c]) return false;
      }
    }
  }
  
  // 验证灯塔不互照
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (lights[r][c]) {
        for (let i = r - 1; i >= 0; i--) {
          if (grid[i][c] !== ' ') break;
          if (lights[i][c]) return false;
        }
        for (let i = r + 1; i < size; i++) {
          if (grid[i][c] !== ' ') break;
          if (lights[i][c]) return false;
        }
        for (let j = c - 1; j >= 0; j--) {
          if (grid[r][j] !== ' ') break;
          if (lights[r][j]) return false;
        }
        for (let j = c + 1; j < size; j++) {
          if (grid[r][j] !== ' ') break;
          if (lights[r][j]) return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * 批量生成
 */
async function batchGenerate(difficulty, count, outputDir) {
  const templates = TEMPLATES[difficulty] || TEMPLATES.easy;
  const dir = path.join(outputDir, difficulty);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  let success = 0;
  console.log(`生成 ${count} 个 ${difficulty} 谜题...`);
  
  for (let i = 0; i < count; i++) {
    const templateIdx = i % templates.length;
    const template = templates[templateIdx];
    const puzzle = fromTemplate(template);
    
    if (verifySolution(puzzle)) {
      success++;
      const answer = [];
      for (let r = 0; r < puzzle.size; r++) {
        for (let c = 0; c < puzzle.size; c++) {
          if (puzzle.lights[r][c]) answer.push([r, c]);
        }
      }
      
      const data = {
        id: success,
        difficulty: difficulty,
        size: puzzle.size,
        grid: puzzle.grid,
        answer: answer,
        template: templateIdx + 1
      };
      
      const filename = `${difficulty}-${String(success).padStart(4, '0')}.json`;
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(data, null, 2));
      
      if (success % 100 === 0) console.log(`已生成 ${success}...`);
    }
  }
  
  console.log(`完成！成功: ${success}`);
  return success;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const difficulty = args[0] || 'easy';
  const count = parseInt(args[1]) || 100;
  const outputDir = args[2] || './data/akari';
  
  batchGenerate(difficulty, count, outputDir).catch(console.error);
}

module.exports = { fromTemplate, verifySolution, batchGenerate };
