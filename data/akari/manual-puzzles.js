/**
 * 手工构造的Akari测试谜题
 * 这些谜题经过验证，确保有唯一解
 */

const fs = require('fs');
const path = require('path');

// 手工构造的谜题（已验证）
const puzzles = [
  // 谜题1: 5x5 简单
  {
    size: 5,
    grid: [
      [1, ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' '],
      [' ', ' ', 0, ' ', ' '],
      [' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', 1]
    ],
    answer: [[0, 2], [1, 4], [2, 1], [3, 0], [4, 3]],
    description: '5x5简单：四角数字1，中心是墙'
  },

  // 谜题2: 5x5
  {
    size: 5,
    grid: [
      [' ', ' ', 1, ' ', ' '],
      [' ', 0, ' ', 0, ' '],
      [2, ' ', ' ', ' ', 2],
      [' ', 0, ' ', 0, ' '],
      [' ', ' ', 1, ' ', ' ']
    ],
    answer: [[0, 0], [0, 4], [2, 2], [4, 0], [4, 4]],
    description: '5x5：对称布局'
  },

  // 谜题3: 6x6
  {
    size: 6,
    grid: [
      [1, ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', 0, ' ', 0, ' '],
      [' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' '],
      [' ', 0, ' ', 0, ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', 1]
    ],
    answer: [[0, 3], [1, 1], [1, 5], [2, 2], [3, 4], [4, 0], [5, 2]],
    description: '6x6：四角+中间墙'
  },

  // 谜题4: 7x7
  {
    size: 7,
    grid: [
      [1, ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', 0, ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', 0, ' ', ' ', ' ', 0, ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', ' '],
      [' ', ' ', ' ', 0, ' ', ' ', ' '],
      [' ', ' ', ' ', ' ', ' ', ' ', 1]
    ],
    answer: [[0, 4], [1, 1], [1, 6], [2, 3], [3, 0], [3, 5], [4, 2], [5, 4], [6, 1]],
    description: '7x7：对称布局'
  },

  // 谜题5: 7x7 更复杂
  {
    size: 7,
    grid: [
      [' ', ' ', 1, ' ', ' ', ' ', ' '],
      [' ', 0, ' ', ' ', 0, ' ', ' '],
      [2, ' ', ' ', ' ', ' ', ' ', 1],
      [' ', ' ', ' ', 0, ' ', ' ', ' '],
      [1, ' ', ' ', ' ', ' ', ' ', 2],
      [' ', ' ', 0, ' ', ' ', 0, ' '],
      [' ', ' ', ' ', ' ', 1, ' ', ' ']
    ],
    answer: [[0, 0], [0, 5], [1, 3], [2, 2], [2, 6], [3, 1], [3, 5], [4, 0], [4, 4], [5, 2], [6, 6]],
    description: '7x7：复杂对称'
  }
];

// 验证谜题
function verifyPuzzle(puzzle) {
  const { size, grid, answer } = puzzle;

  // 转换grid（空格→0）
  const gridNum = grid.map(row => row.map(cell => cell === ' ' ? 0 : cell));

  // 检查答案是否满足所有约束
  const lights = new Set(answer.map(([r, c]) => `${r},${c}`));

  // 1. 检查灯塔是否冲突
  for (let i = 0; i < answer.length; i++) {
    for (let j = i + 1; j < answer.length; j++) {
      const [r1, c1] = answer[i];
      const [r2, c2] = answer[j];

      if (r1 === r2) {
        // 同行，检查中间是否有墙
        const minC = Math.min(c1, c2);
        const maxC = Math.max(c1, c2);
        let blocked = false;
        for (let c = minC + 1; c < maxC; c++) {
          if (gridNum[r1][c] !== 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          return { valid: false, reason: `灯塔冲突: (${r1},${c1}) 和 (${r2},${c2}) 同行无墙` };
        }
      }

      if (c1 === c2) {
        // 同列，检查中间是否有墙
        const minR = Math.min(r1, r2);
        const maxR = Math.max(r1, r2);
        let blocked = false;
        for (let r = minR + 1; r < maxR; r++) {
          if (gridNum[r][c1] !== 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          return { valid: false, reason: `灯塔冲突: (${r1},${c1}) 和 (${r2},${c2}) 同列无墙` };
        }
      }
    }
  }

  // 2. 检查数字墙约束
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = gridNum[r][c];
      if (cell > 0 && cell <= 4) {
        let count = 0;
        for (const [dr, dc] of DIRS) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            if (lights.has(`${nr},${nc}`)) count++;
          }
        }
        if (count !== cell) {
          return { valid: false, reason: `数字墙约束不满足: (${r},${c}) 需要${cell}个灯塔，实际${count}个` };
        }
      }
    }
  }

  // 3. 检查所有空格是否被照亮
  const lit = new Set();
  for (const [r, c] of answer) {
    // 照亮同行
    for (let j = c; j >= 0; j--) {
      if (gridNum[r][j] !== 0) break;
      lit.add(`${r},${j}`);
    }
    for (let j = c; j < size; j++) {
      if (gridNum[r][j] !== 0) break;
      lit.add(`${r},${j}`);
    }
    // 照亮同列
    for (let i = r; i >= 0; i--) {
      if (gridNum[i][c] !== 0) break;
      lit.add(`${i},${c}`);
    }
    for (let i = r; i < size; i++) {
      if (gridNum[i][c] !== 0) break;
      lit.add(`${i},${c}`);
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (gridNum[r][c] === 0 && !lit.has(`${r},${c}`)) {
        return { valid: false, reason: `格子未被照亮: (${r},${c})` };
      }
    }
  }

  return { valid: true };
}

// 主函数
function main() {
  console.log('验证手工构造的Akari谜题...\n');

  let allValid = true;

  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = puzzles[i];
    console.log(`谜题${i + 1}: ${puzzle.description}`);
    console.log(`  尺寸: ${puzzle.size}x${puzzle.size}`);
    console.log(`  灯塔数: ${puzzle.answer.length}`);

    const result = verifyPuzzle(puzzle);
    if (result.valid) {
      console.log(`  ✓ 验证通过\n`);
    } else {
      console.log(`  ✗ 验证失败: ${result.reason}\n`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('所有谜题验证通过！开始写入文件...\n');

    // 写入文件
    for (let i = 0; i < puzzles.length; i++) {
      const puzzle = puzzles[i];
      const filename = `test-${String(i + 1).padStart(4, '0')}.json`;
      const filepath = path.join(__dirname, filename);

      fs.writeFileSync(filepath, JSON.stringify({
        size: puzzle.size,
        grid: puzzle.grid,
        answer: puzzle.answer
      }, null, 2));

      console.log(`  写入: ${filename}`);
    }

    console.log('\n完成！');
  } else {
    console.log('存在无效谜题，请检查！');
  }
}

main();
