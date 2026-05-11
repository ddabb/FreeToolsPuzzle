/**
 * 诗词数据转换脚本 v4
 * 优化目标：用户搜索场景优先
 *
 * 用户搜索行为分析：
 * 1. 搜诗人 → 知道名字（李白、杜甫）→ poet/{letter}.json 按需加载
 * 2. 搜诗名 → 知道标题（静夜思、将进酒）→ index.json 全量诗名索引
 * 3. 搜诗句/名句 → 记得名句（床前明月光、春眠不觉晓）→ index.json 全文索引
 * 4. 按朝代浏览 → 选唐代、宋代等 → poet/ 各字母文件含 dynasty 字段
 *
 * 数据架构：
 * - index.json（启动加载）→ 全量诗人索引 + 紧凑全文索引（ID-based 倒排）
 * - poet/{letter}.json（按需加载）→ 诗人完整数据（含诗词内容）
 *
 * 全文索引设计（紧凑倒排索引）：
 * - ftEntry[]: 紧凑条目表，每首被索引的诗分配一个数字 ID
 *   ftEntry[id] = { t: 诗名, a: 作者名 }
 * - ft{}: 倒排表，key=汉字，value=数字 ID 数组
 *   用户搜"静夜" → 取 ft['静'] ∩ ft['夜'] 的 ID 交集 → 用 ftEntry[id] 还原
 * - 相比存储完整字符串，数字 ID 可节省 80%+ 体积
 */

const fs = require('fs');
const path = require('path');

const SRC = path.resolve('F:/SelfJob/poetryesm-temp/source');
const DST = path.resolve('F:/SelfJob/FreeToolsPuzzle/data/poetry');

// 姓氏拼音首字母映射
const PINYIN_MAP = {
  '丁':'d','万':'w','上':'s','东方':'d','严':'y','元':'y','岑':'c',
  '左':'z','文':'w','柳':'l','白':'b','卢':'l','顾':'g','孟':'m',
  '宋':'s','张':'z','李':'l','杨':'y','杜':'d','沈':'s','苏':'s',
  '陆':'l','陈':'c','韦':'w','韩':'h','马':'m','高':'g','魏':'w',
  '谢':'x','贾':'j','贺':'h','赵':'z','刘':'l','王':'w','罗':'l',
  '周':'z','吴':'w','郑':'z','孙':'s','胡':'h','朱':'z','林':'l',
  '何':'h','郭':'g',
  '冯':'f','董':'d','萧':'x','程':'c','曹':'c','袁':'y','邓':'d',
  '许':'x','傅':'f','沈':'s','曾':'z','彭':'p','吕':'l','苏':'s',
  '卢':'l','蒋':'j','蔡':'c','丁':'d','魏':'w','薛':'x',
  '叶':'y','阎':'y','余':'y','潘':'p','戴':'d','夏':'d',
  '钟':'z','汪':'w','任':'r','姜':'j','范':'f','方':'f','石':'s',
  '姚':'y','谭':'t','廖':'l','邹':'z','熊':'x','金':'j','郝':'h',
  '孔':'k','崔':'c','康':'k','毛':'m','邱':'q','秦':'q',
  '江':'j','史':'s',
  '侯':'h','邵':'s','龙':'l','段':'d','雷':'l','钱':'q','汤':'t',
  '尹':'y','黎':'l','易':'y','常':'c','武':'w','乔':'q','赖':'l',
  '龚':'g',
  '申':'s','向':'x','管':'g','翁':'w',
  '司马':'s','欧阳':'o','皇甫':'h','长孙':'z','令狐':'l','上官':'s',
  '诸葛':'z','尉迟':'y','慕容':'m','宇文':'y','司徒':'s','端木':'d',
  '司空':'s','南宫':'n','闾丘':'l','澹台':'t','公冶':'g','淳于':'c',
  '百里':'b','东郭':'d','赫连':'h',
};

function getPinyinInitial(name) {
  if (!name) return '#';
  for (const [key, val] of Object.entries(PINYIN_MAP)) {
    if (key.length > 1 && name.startsWith(key)) return val;
  }
  const firstChar = name[0];
  if (PINYIN_MAP[firstChar]) return PINYIN_MAP[firstChar];
  const code = firstChar.charCodeAt(0);
  if (code >= 0x4E00 && code <= 0x9FFF) {
    if (code < 0x4EFF) return 'd';
    if (code < 0x5227) return 'l';
    if (code < 0x56FF) return 's';
    if (code < 0x5BFF) return 'z';
    if (code < 0x60FF) return 'l';
    if (code < 0x65FF) return 'w';
    if (code < 0x6AFF) return 'z';
    if (code < 0x6FFF) return 'h';
    if (code < 0x74FF) return 'z';
    if (code < 0x79FF) return 'x';
    if (code < 0x7EFF) return 'c';
    if (code < 0x83FF) return 'y';
    if (code < 0x88FF) return 'g';
    if (code < 0x8DFF) return 'w';
    if (code < 0x92FF) return 's';
    if (code < 0x97FF) return 'h';
    if (code < 0x9CFF) return 'm';
    return 'z';
  }
  if (/[a-zA-Z]/.test(firstChar)) return firstChar.toLowerCase();
  return '#';
}

function transformPoem(raw) {
  const result = { n: raw.Name, c: (raw.Contents || []).join('') };
  if (raw.Form && raw.Form !== '未知') result.f = raw.Form;
  return result;
}

function transformPoet(raw, dynasty) {
  const poems = (raw.Poems || []).map(p => transformPoem(p));
  const result = { n: raw.Name, d: dynasty, p: poems };
  if (raw.Description && raw.Description.trim()) {
    result.desc = raw.Description.trim().substring(0, 200);
  }
  return result;
}

function main() {
  console.log('=== 诗词数据转换 v4 (搜索场景优先 · 紧凑版) ===');
  console.log('源目录:', SRC);
  console.log('目标目录:', DST);

  if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });
  const poetDir = path.join(DST, 'poet');
  if (!fs.existsSync(poetDir)) fs.mkdirSync(poetDir, { recursive: true });

  // 清除旧文件
  for (const f of fs.readdirSync(DST).filter(f => f.endsWith('.json'))) {
    fs.unlinkSync(path.join(DST, f));
  }
  if (fs.existsSync(poetDir)) {
    for (const f of fs.readdirSync(poetDir).filter(f => f.endsWith('.json'))) {
      fs.unlinkSync(path.join(poetDir, f));
    }
  }

  // Step 1: 读取所有诗人数据
  const letterGroups = {};
  const allPoets = [];
  const fullTextEntries = []; // [ {t:诗名, a:作者}, ... ]
  const fullTextIndex = {};  // { char: [id1, id2, ...] }
  let totalPoets = 0, totalPoems = 0;
  const dynastyStats = {};
  let poemId = 0;

  const dynastyDirs = fs.readdirSync(SRC).filter(d => {
    return fs.statSync(path.join(SRC, d)).isDirectory();
  });

  console.log('\n[Step 1] 读取诗人数据 + 构建全文索引...');
  for (const dynasty of dynastyDirs) {
    const dynastyDir = path.join(SRC, dynasty);
    const files = fs.readdirSync(dynastyDir).filter(f => f.endsWith('.json'));
    let dc = 0, pc = 0;

    for (const file of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(dynastyDir, file), 'utf-8'));
      const transformed = transformPoet(raw, dynasty);
      const initial = getPinyinInitial(transformed.n);

      if (!letterGroups[initial]) letterGroups[initial] = [];
      letterGroups[initial].push(transformed);

      allPoets.push({
        n: transformed.n,
        i: initial,
        d: dynasty,
        pc: transformed.p.length,
      });

      // 全文索引：诗名（前10字） + 首句（前40字），用数字 ID 压缩
      for (const poem of transformed.p) {
        const entryId = poemId++;
        fullTextEntries.push({ t: poem.n, a: transformed.n, d: dynasty });

        // 索引诗名（去标点，取前10字）
        const titleChars = poem.n.replace(/[，。！？；：、""''【】『』]/g, '').substring(0, 10);
        for (const ch of titleChars) {
          if (!fullTextIndex[ch]) fullTextIndex[ch] = [];
          fullTextIndex[ch].push(entryId);
        }
        // 索引首句（前40字）
        const firstLine = poem.c.substring(0, 40);
        for (const ch of firstLine) {
          if (!fullTextIndex[ch]) fullTextIndex[ch] = [];
          fullTextIndex[ch].push(entryId);
        }
      }

      dc++;
      pc += transformed.p.length;
    }

    dynastyStats[dynasty] = { poets: dc, poems: pc };
    totalPoets += dc;
    totalPoems += pc;
    console.log('  ' + dynasty + ': ' + dc + '诗人 ' + pc + '首');
  }

  console.log('\n  全量: ' + totalPoets + '诗人 ' + totalPoems + '首');
  console.log('  全文索引条目: ' + fullTextEntries.length);
  console.log('  索引字符数: ' + Object.keys(fullTextIndex).length);

  // Step 2: 写入各字母分片
  console.log('\n[Step 2] 写入 poet/ 字母分片...');
  const letterInfo = {};
  let totalPoetSize = 0;

  const letters = Object.keys(letterGroups).sort();
  for (const letter of letters) {
    const poets = letterGroups[letter];
    const json = JSON.stringify(poets);
    fs.writeFileSync(path.join(poetDir, letter + '.json'), json, 'utf-8');
    const sizeKB = Math.round(Buffer.byteLength(json, 'utf-8') / 1024);
    totalPoetSize += sizeKB;
    letterInfo[letter] = {
      file: letter + '.json',
      poetCount: poets.length,
      poemCount: poets.reduce(function(s, p) { return s + p.p.length; }, 0),
      sizeKB: sizeKB,
    };
    console.log('  ' + letter + '.json: ' + poets.length + '诗人 ' + sizeKB + 'KB');
  }

  // Step 3: 写入 index.json
  const indexData = {
    version: 4,
    totalPoets: totalPoets,
    totalPoems: totalPoems,
    // 朝代分布（用于侧边栏筛选）
    dynasties: Object.entries(dynastyStats).map(function(e) { return { name: e[0], poets: e[1].poets, poems: e[1].poems }; }),
    // 字母分片信息（用于按需加载）
    letters: letterInfo,
    // 全量诗人索引（用于诗人名搜索）
    poets: allPoets,
    // 全文索引：紧凑倒排表
    // ftEntry[]: 条目表 ftEntry[id] = {t:诗名, a:作者}
    // ft{}: { char: [id1, id2, ...] }
    ftEntry: fullTextEntries,
    ft: fullTextIndex,
  };

  const indexJson = JSON.stringify(indexData);
  fs.writeFileSync(path.join(DST, 'index.json'), indexJson, 'utf-8');
  const indexSizeKB = Math.round(Buffer.byteLength(indexJson, 'utf-8') / 1024);
  const totalSizeKB = indexSizeKB + totalPoetSize;

  console.log('\n[Step 3] 写入 index.json');
  console.log('  index.json: ' + indexSizeKB + 'KB');
  console.log('  - poets[]: ' + allPoets.length + '诗人');
  console.log('  - ftEntry[]: ' + fullTextEntries.length + '条');
  console.log('  - ft{}: ' + Object.keys(fullTextIndex).length + '个字符');

  console.log('\n=== 转换完成 ===');
  console.log('总诗人: ' + totalPoets);
  console.log('总诗词: ' + totalPoems);
  console.log('index.json: ' + indexSizeKB + 'KB');
  console.log('poet/ 总计: ' + totalPoetSize + 'KB');
  console.log('CDN 总大小: ' + totalSizeKB + 'KB (' + Math.round(totalSizeKB / 1024 * 10) / 10 + 'MB)');

  console.log('\n=== 字母文件 TOP5 ===');
  Object.entries(letterInfo)
    .sort(function(a, b) { return b[1].sizeKB - a[1].sizeKB; })
    .slice(0, 5)
    .forEach(function(e) {
      console.log('  ' + e[0] + '.json: ' + e[1].sizeKB + 'KB (' + e[1].poetCount + '诗人 ' + e[1].poemCount + '首)');
    });

  // 搜索功能验证
  console.log('\n=== 搜索验证 ===');
  function testSearch(idx, query) {
    var chars = query.split('');
    if (!chars.length) return [];
    var sets = chars.map(function(ch) { return new Set(idx.ft[ch] || []); });
    var intersect = sets.slice(1).reduce(function(acc, set) {
      var result = new Set();
      for (var x of acc) { if (set.has(x)) result.add(x); }
      return result;
    }, sets[0] || new Set());
    return Array.from(intersect).map(function(id) { return idx.ftEntry[id]; });
  }

  var tests = [
    ['静夜思', 'poem title'],
    ['床前', 'poem first line'],
    ['将进酒', 'poem title'],
    ['李白', 'poet name'],
    ['春眠', 'poem first line'],
    ['天下谁人不识君', 'famous verse'],
  ];

  tests.forEach(function(t) {
    var q = t[0], label = t[1];
    var r = testSearch(indexData, q);
    console.log('  search "' + q + '" (' + label + '): ' + r.length + ' results');
    if (r.length > 0) {
      var samples = r.slice(0, 3).map(function(e) { return e.t + ' by ' + e.a; }).join(', ');
      console.log('    -> ' + samples + (r.length > 3 ? ' ...' : ''));
    }
  });
}

main();
