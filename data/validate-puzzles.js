/**
 * 游戏题目验证工具
 * 验证各游戏题目是否有唯一解
 */

const fs = require('fs');
const path = require('path');

// 导入各游戏的验证器
const validateMinesweeper = require('./validators/minesweeper');
const validateSlitherLink = require('./validators/slither-link');
const validateHitori = require('./validators/hitori');
const validateAkari = require('./validators/akari');
const validateNurikabe = require('./validators/nurikabe');
const validateBattleship = require('./validators/battleship');

/**
 * 验证单个游戏的题目
 * @param {string} gameName 游戏名称
 * @param {function} validator 验证函数
 */
function validateGame(gameName, validator) {
  const gameDir = path.join(__dirname, gameName);
  if (!fs.existsSync(gameDir)) {
    console.log(gameName + ': 目录不存在');
    return;
  }

  const files = fs.readdirSync(gameDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  let validCount = 0;
  let invalidCount = 0;

  console.log('\n=== 开始验证 ' + gameName + ' 游戏题目 ===');
  console.log('找到 ' + files.length + ' 个题目文件');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const filePath = path.join(gameDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const puzzle = JSON.parse(content);
      
      // 调试：打印第一个文件的内容
      if (i === 0) {
        console.log('\n第一个文件内容:');
        console.log(JSON.stringify(puzzle, null, 2));
      }
      
      if (validator(puzzle)) {
        validCount++;
      } else {
        invalidCount++;
        // 只打印前10个无效文件
        if (invalidCount <= 10) {
          console.log('无效题目: ' + file);
        }
      }
      
      // 每验证200个题目汇报一次进度，减少输出频率
      if ((i + 1) % 200 === 0) {
        console.log('进度: ' + (i + 1) + '/' + files.length + ', 有效: ' + validCount + ', 无效: ' + invalidCount);
      }
    } catch (error) {
      invalidCount++;
      // 只打印前10个错误
      if (invalidCount <= 10) {
        console.log('读取错误: ' + file + ' - ' + error.message);
      }
    }
  }

  console.log('\n=== ' + gameName + ' 游戏验证完成 ===');
  console.log('总计: ' + files.length + ', 有效: ' + validCount + ', 无效: ' + invalidCount);
  console.log('====================================');
}

/**
 * 验证所有游戏的题目
 */
function validateAllGames() {
  const games = [
    { name: 'minesweeper', validator: validateMinesweeper },
    { name: 'slither-link', validator: validateSlitherLink },
    { name: 'hitori', validator: validateHitori },
    { name: 'akari', validator: validateAkari },
    { name: 'nurikabe', validator: validateNurikabe },
    { name: 'battleship', validator: validateBattleship }
  ];

  console.log('开始验证所有游戏题目...');
  console.log('总计 ' + games.length + ' 个游戏需要验证');
  console.log('====================================');

  for (const game of games) {
    validateGame(game.name, game.validator);
  }

  console.log('\n所有游戏题目验证完成！');
}

// 运行验证
validateAllGames();