/**
 * 成语数据处理脚本 v2
 * 用手动解析方式处理 CSV 数据
 */

const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const dataDir = __dirname;
const content = fs.readFileSync(path.join(dataDir, 'idiom-source.txt'), 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

console.debug(`共 ${lines.length} 条，开始解析...`);

// ============================================================
// 手动 CSV 解析：先切7个字段
// ============================================================
function parseLine(line) {
  // 1. ID（第一个逗号之前）
  const firstComma = line.indexOf(',');
  if (firstComma === -1) return null;
  const id = line.substring(0, firstComma).trim();
  let s = line.substring(firstComma + 1);

  // 剩余6个字段，找前5个引号闭合位置，再切最后1个
  const fieldEnds = [];
  let inQuote = false;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '"') inQuote = !inQuote;
    if (!inQuote && s[i] === ',') {
      fieldEnds.push(i);
      if (fieldEnds.length >= 5) break;
    }
  }

  if (fieldEnds.length < 5) return null;

  const f1 = s.substring(0, fieldEnds[0]).trim().replace(/^"|"$/g, '').trim();
  const f2 = s.substring(fieldEnds[0] + 1, fieldEnds[1]).trim().replace(/^"|"$/g, '').trim();
  const f3 = s.substring(fieldEnds[1] + 1, fieldEnds[2]).trim().replace(/^"|"$/g, '').trim();
  const f4 = s.substring(fieldEnds[2] + 1, fieldEnds[3]).trim().replace(/^"|"$/g, '').trim();
  const f5 = s.substring(fieldEnds[3] + 1, fieldEnds[4]).trim().replace(/^"|"$/g, '').trim();
  const f6 = s.substring(fieldEnds[4] + 1).trim().replace(/^"|"$/g, '').trim();

  return {
    id,
    word: f1,
    pinyin: f2,
    explanation: f3,
    derivation: f4,
    example: f5,
    abbr: f6
  };
}

// ============================================================
// 处理成语，生成索引字段
// ============================================================
function getFirstChar(word) {
  try {
    return pinyin(word[0], { toneType: 'none' }).charAt(0).toLowerCase();
  } catch {
    return '?';
  }
}

function getLastChar(word) {
  try {
    return pinyin(word[word.length - 1], { toneType: 'none' }).toLowerCase();
  } catch {
    return '?';
  }
}

const idioms = [];
let skipped = 0;

for (const line of lines) {
  const entry = parseLine(line);
  if (!entry || !entry.word || entry.word.length < 2) {
    skipped++;
    if (skipped <= 3) console.debug('跳过:', line.substring(0, 80));
    continue;
  }

  const cleanPinyin = entry.pinyin.replace(/\s{2,}/g, ' ').trim();

  idioms.push({
    word: entry.word,
    pinyin: cleanPinyin,
    firstChar: getFirstChar(entry.word),
    lastChar: getLastChar(entry.word),
    explanation: entry.explanation,
    derivation: entry.derivation,
    example: entry.example,
    abbr: entry.abbr || ''
  });
}

console.debug(`解析完成: ${idioms.length} 条有效，跳过 ${skipped} 条`);

// ============================================================
// 去重 & 排序
// ============================================================
const wordSet = new Set();
const unique = idioms.filter(item => {
  if (wordSet.has(item.word)) return false;
  wordSet.add(item.word);
  return true;
});
unique.sort((a, b) => a.word.localeCompare(b.word));
console.debug(`去重后: ${unique.length} 条`);

// ============================================================
// 输出文件
// ============================================================
const outDir = dataDir;

// idiom.json（完整版，用于调试）
fs.writeFileSync(path.join(outDir, 'idiom.json'), JSON.stringify(unique), 'utf8');
console.debug('✓ idiom.json', (JSON.stringify(unique).length/1024).toFixed(0), 'KB');

// ============================================================
// 按首字母分片：生成 letter/a.json, letter/b.json, ...
// ============================================================
const letterDir = path.join(outDir, 'letter');
if (!fs.existsSync(letterDir)) fs.mkdirSync(letterDir, { recursive: true });

const byLetter = {};
for (const item of unique) {
  const fc = item.firstChar;
  if (!byLetter[fc]) byLetter[fc] = [];
  byLetter[fc].push(item);
}

const letters = Object.keys(byLetter).sort();
for (const letter of letters) {
  const compact = byLetter[letter].map(i => ({
    w: i.word,
    p: i.pinyin,
    l: i.lastChar,
    e: i.explanation,
    d: i.derivation
  }));
  fs.writeFileSync(path.join(letterDir, `${letter}.json`), JSON.stringify(compact), 'utf8');
  console.debug(`  letter/${letter}.json: ${compact.length} 条 (${(JSON.stringify(compact).length/1024).toFixed(0)}KB)`);
}

// 按首字索引
const firstIndex = {};
for (const item of unique) {
  const fc = item.firstChar;
  if (!firstIndex[fc]) firstIndex[fc] = [];
  firstIndex[fc].push(item.word);
}
for (const k of Object.keys(firstIndex)) firstIndex[k].sort();
fs.writeFileSync(path.join(outDir, 'idiom-first-index.json'), JSON.stringify(firstIndex), 'utf8');
console.debug('✓ idiom-first-index.json', Object.keys(firstIndex).length, '个首字母');

// 按尾字索引
const lastIndex = {};
for (const item of unique) {
  const lc = item.lastChar;
  if (!lastIndex[lc]) lastIndex[lc] = [];
  lastIndex[lc].push(item.word);
}
for (const k of Object.keys(lastIndex)) lastIndex[k].sort();
fs.writeFileSync(path.join(outDir, 'idiom-last-index.json'), JSON.stringify(lastIndex), 'utf8');
console.debug('✓ idiom-last-index.json', Object.keys(lastIndex).length, '个尾字母');

// 统计
const stats = {
  total: unique.length,
  fourChar: unique.filter(i => i.word.length === 4).length,
  fiveChar: unique.filter(i => i.word.length === 5).length,
  sixPlusChar: unique.filter(i => i.word.length >= 6).length,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 2), 'utf8');
console.debug('\n统计:', JSON.stringify(stats));
console.debug('\n全部完成！');
