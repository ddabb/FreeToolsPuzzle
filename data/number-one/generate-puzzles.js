/**
 * 生成数壹(Hitori)题库数据
 * 按难度分目录，与躲避牛蛙(akari)结构一致
 */
const fs = require('fs');
const path = require('path');
const core = require('./number-one-core');

// 输出目录
const OUTPUT_DIR = path.join(__dirname);

// 难度配置
const DIFFICULTY_MAP = {
  easy: { value: 1, name: 'easy' },
  medium: { value: 2, name: 'medium' }, 
  hard: { value: 3, name: 'hard' }
};

// 每种难度和尺寸的题目数量
const PUZZLE_COUNT = 30;

function generateForDifficulty(difficultyName, difficultyValue, sizes) {
  const dir = path.join(OUTPUT_DIR, difficultyName);
  
  // 确保目录存在
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const size of sizes) {
    console.log(`\n生成 ${difficultyName} ${size}×${size} 题目...`);
    
    let count = 0;
    let failCount = 0;
    const puzzles = [];
    
    while (count < PUZZLE_COUNT && failCount < 100) {
      const puzzle = core.generate(size, difficultyValue);
      if (puzzle) {
        // 格式化数据为akari风格
        const formatted = {
          id: count + 1,
          difficulty: difficultyName,
          size: puzzle.size,
          blackRatio: puzzle.blackRatio,
          blackCount: puzzle.blackCount,
          board: puzzle.board,
          solution: puzzle.solution,
          seed: Math.floor(Math.random() * 999999)
        };
        
        puzzles.push(formatted);
        count++;
        process.stdout.write(`\r  进度: ${count}/${PUZZLE_COUNT}`);
      } else {
        failCount++;
      }
    }
    
    console.log(`\n  完成: ${count} 题 (失败 ${failCount} 次)`);
    
    // 保存到文件 (每种尺寸一个文件，包含所有该尺寸的题目)
    // 符合akari风格的命名：尺寸-序号.json
    for (let i = 0; i < puzzles.length; i++) {
      const filename = `${size}-${String(i + 1).padStart(4, '0')}.json`;
      const filepath = path.join(dir, filename);
      fs.writeFileSync(filepath, JSON.stringify(puzzles[i], null, 0));
    }
    
    console.log(`  已保存到 ${difficultyName}/${size}-XXXX.json`);
  }
}

console.log('开始生成数壹题库...');
console.log('输出目录:', OUTPUT_DIR);

// 生成各难度级别的题目
// 简单：5×5, 6×6
generateForDifficulty('easy', 1, [5, 6]);

// 中等：6×6, 7×7
generateForDifficulty('medium', 2, [6, 7]);

// 困难：7×7, 8×8
generateForDifficulty('hard', 3, [7, 8]);

console.log('\n完成！数壹题库已生成。');
