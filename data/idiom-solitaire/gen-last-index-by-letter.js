/**
 * 成语尾字索引按字母分片脚本
 * 将 idiom-last-index.json 拆分为 letter-last/a.json ~ letter-last/z.json
 *
 * 用法: node gen-last-index-by-letter.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = __dirname;
const lastIndexPath = path.join(dataDir, 'idiom-last-index.json');
const letterDir = path.join(dataDir, 'letter-last');

// 读取尾字索引
console.debug('读取 idiom-last-index.json...');
const lastIndex = JSON.parse(fs.readFileSync(lastIndexPath, 'utf8'));

// 统计每个尾字包含多少个首字母组合
let totalEntries = 0;
const letterGroups = {}; // { a: { wei: ['畏首畏尾', ...], wen: [...] }, b: {...} }

for (const [lastPy, words] of Object.entries(lastIndex)) {
  // lastPy 格式: "wei", "an", "chang" 等完整拼音
  const letter = lastPy.charAt(0); // 取首字母 a-z
  if (!letterGroups[letter]) letterGroups[letter] = {};
  letterGroups[letter][lastPy] = words;
  totalEntries += words.length;
}

console.debug(`共 ${Object.keys(lastIndex).length} 个尾字拼音，` +
  `${Object.keys(letterGroups).length} 个首字母分组，` +
  `${totalEntries} 条记录`);

// 创建输出目录
if (!fs.existsSync(letterDir)) {
  fs.mkdirSync(letterDir, { recursive: true });
}

// 生成字母分片文件
const letters = Object.keys(letterGroups).sort();
let totalSize = 0;

for (const letter of letters) {
  const content = JSON.stringify(letterGroups[letter]);
  const filePath = path.join(letterDir, `${letter}.json`);
  fs.writeFileSync(filePath, content, 'utf8');
  const sizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);
  totalSize += Buffer.byteLength(content, 'utf8');
  const pyCount = Object.keys(letterGroups[letter]).length;
  const wordCount = Object.values(letterGroups[letter]).reduce((s, arr) => s + arr.length, 0);
  console.debug(`  letter-last/${letter}.json: ${pyCount} 个尾字拼音, ${wordCount} 个成语 (${sizeKB}KB)`);
}

console.debug(`\n总计: ${totalSize / 1024 / 1024} MB（应约等于原文件 ${(fs.statSync(lastIndexPath).size / 1024 / 1024).toFixed(2)} MB）`);

// 生成元数据文件（包含每个字母文件的基本信息，用于预加载提示）
const meta = {};
for (const letter of letters) {
  const pyKeys = Object.keys(letterGroups[letter]);
  const wordCount = Object.values(letterGroups[letter]).reduce((s, arr) => s + arr.length, 0);
  meta[letter] = { pyCount: pyKeys.length, wordCount };
}
fs.writeFileSync(
  path.join(letterDir, 'meta.json'),
  JSON.stringify(meta, null, 2),
  'utf8'
);
console.debug('✓ letter-last/meta.json 生成完成');
console.debug('\n全部完成！请将 letter-last/ 目录上传到 CDN:');
console.debug(`  ${path.join(letterDir)}`);
console.debug(`  上传路径: data/idiom-solitaire/letter-last/`);
