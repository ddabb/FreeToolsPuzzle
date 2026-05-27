/**
 * 分游戏精确统计 + 结构检查
 * 判断每个游戏的数据是"有答案可验证"、"扁平JSON"、"子目录JSON"
 */
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const skipDirs = new Set(['validators', 'sounds', 'poetry', 'wordbank', 'miniprogram_npm']);

function getGameInfo(gameName) {
  const gameDir = path.join(dataDir, gameName);
  if (!fs.existsSync(gameDir)) return null;
  const stat = fs.statSync(gameDir);
  if (!stat.isDirectory()) return null;

  const entries = fs.readdirSync(gameDir);
  const subDirs = entries.filter(e => {
    try { return fs.statSync(path.join(gameDir, e)).isDirectory(); } catch { return false; }
  });
  const files = entries.filter(e => {
    try { return fs.statSync(path.join(gameDir, e)).isFile(); } catch { return false; }
  });

  const jsonFiles = [];
  function collect(dir) {
    for (const e of fs.readdirSync(dir)) {
      const full = path.join(dir, e);
      try {
        if (fs.statSync(full).isDirectory()) collect(full);
        else if (e.endsWith('.json')) jsonFiles.push(full);
      } catch {}
    }
  }
  collect(gameDir);

  return { gameName, subDirs, files, totalJson: jsonFiles.length, jsonFiles };
}

const results = [];
for (const name of fs.readdirSync(dataDir)) {
  if (skipDirs.has(name)) continue;
  const info = getGameInfo(name);
  if (!info) continue;

  // 读几个 JSON 样本看结构
  const sampleFiles = info.jsonFiles.slice(0, 3);
  const samples = [];
  for (const f of sampleFiles) {
    try {
      const content = JSON.parse(fs.readFileSync(f, 'utf8'));
      const keys = Object.keys(content);
      samples.push({ file: path.basename(f), keys, hasId: 'id' in content, hasAnswer: 'answer' in content, hasGrid: 'grid' in content });
    } catch {
      samples.push({ file: path.basename(f), error: 'parse error' });
    }
  }

  results.push({
    name,
    subDirs: info.subDirs.join(', '),
    totalJson: info.totalJson,
    samples
  });
}

console.log(JSON.stringify(results, null, 2));