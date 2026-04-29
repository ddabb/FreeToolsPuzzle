/**
 * docs 文章转换脚本
 * 
 * 把 docs/articles/published/ 目录下的文章
 * 转换为 data/know/source/ 格式
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 路径配置
const SOURCE_DIR = path.join(__dirname, '..', 'docs', 'articles', 'published');
const TARGET_DIR = path.join(__dirname, 'know', 'source');

// 文章元数据（从文件名和内容推断）
const ARTICLE_META = {
  '001-freetools-user-guide': {
    title: 'FreeTools 用户使用指南',
    description: '随身工具宝小程序完整使用教程，从入门到精通',
    category: '产品使用',
    tags: ['使用指南', '教程', '工具宝']
  },
  '002-freetools-dev-philosophy': {
    title: 'FreeTools 开发思路',
    description: '随身工具宝小程序开发思路与技术选型分享',
    category: '产品设计',
    tags: ['开发', '技术选型', '产品']
  },
  '003-freetools-usage-scenarios': {
    title: 'FreeTools 使用场景',
    description: '随身工具宝小程序的各种使用场景详解',
    category: '产品设计',
    tags: ['使用场景', '用户场景']
  },
  '004-freetools-positioning': {
    title: 'FreeTools 产品定位',
    description: '随身工具宝小程序的产品定位与差异化分析',
    category: '产品设计',
    tags: ['产品定位', '差异化', '竞品分析']
  },
  '004-freetools-positioning-pivot': {
    title: 'FreeTools 转型之路',
    description: '从工具集合到知识查询的产品转型思考',
    category: '产品设计',
    tags: ['产品转型', '知识库', '产品迭代']
  },
  '005-freetools-qclaw-best-practices': {
    title: 'QClaw AI 辅助开发最佳实践',
    description: '使用 QClaw AI 助手辅助小程序开发的最佳实践',
    category: '开发实践',
    tags: ['AI辅助', 'QClaw', '开发效率', '最佳实践']
  },
  '006-freetools-less-is-more': {
    title: '少即是多：57个工具到5个核心',
    description: '从「贪多求全」到「少即是多」，一个产品经理的认知升级',
    category: '产品思考',
    tags: ['产品思考', '少即是多', '产品哲学']
  },
  '007-freetools-data-story': {
    title: '数据说话：用数据驱动产品决策',
    description: '如何通过数据分析发现产品问题并优化',
    category: '产品思考',
    tags: ['数据分析', '数据驱动', '产品优化']
  },
  '008-freetools-free-is-expensive': {
    title: '免费是最贵的',
    description: '为什么说「免费」其实是最昂贵的商业模式',
    category: '产品思考',
    tags: ['商业模式', '免费', '产品思考']
  },
  '009-freetools-cognitive-science': {
    title: '认知科学解释工具焦虑',
    description: '用认知科学解释为什么人们总是「收藏=学会」',
    category: '产品思考',
    tags: ['认知科学', '心理学', '用户行为']
  },
  '010-freetools-midnight-coding': {
    title: '深夜写代码的人',
    description: '程序员深夜coding的乐趣与坚持',
    category: '开发者故事',
    tags: ['开发者', '编程', '程序人生']
  },
  '011-freetools-zero-cost-opensource': {
    title: '零成本+开源：个人开发者的组合拳',
    description: '如何用零成本+开源打造个人产品矩阵',
    category: '开发实践',
    tags: ['开源', '零成本', '开发者工具']
  },
  '012-freetools-dev-pitfalls': {
    title: '开发踩坑记',
    description: '小程序开发过程中的常见问题和解决方案',
    category: '开发实践',
    tags: ['踩坑', '问题解决', '开发经验']
  },
  '013-freetools-opensource-mit': {
    title: 'MIT 协议开源',
    description: '为什么要选择 MIT 协议进行开源',
    category: '开发实践',
    tags: ['开源', 'MIT协议', '许可证']
  }
};

// 读取 docs 文章
function readDocsArticles() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
    return [];
  }

  const files = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const filePath = path.join(SOURCE_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      return { filename, filePath, content };
    });

  console.debug(`📁 找到 ${files.length} 篇 docs 文章\n`);
  return files;
}

// 转换单个文章
function convertArticle(article) {
  const { filename, content } = article;
  
  // 获取元数据
  const key = filename.replace('.md', '');
  const meta = ARTICLE_META[key];
  
  if (!meta) {
    console.warn(`⚠️  未找到元数据: ${filename}`);
    return null;
  }

  // 提取正文内容（去掉标题和分隔线）
  let body = content;
  
  // 去掉文件开头的标题（# 开头）
  const lines = body.split('\n');
  let startIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 跳过空行
    if (line === '') continue;
    // 如果是标题或分隔线，继续往下找
    if (line.startsWith('#') || line === '---') {
      startIndex = i + 1;
    } else {
      break;
    }
  }
  
  body = lines.slice(startIndex).join('\n').trim();
  
  // 构建 Front Matter
  const frontMatter = {
    title: meta.title,
    description: meta.description,
    category: meta.category,
    tags: meta.tags
  };

  // 组合新内容
  const newContent = '---\n' + yaml.dump(frontMatter, { indent: 2, lineWidth: -1 }) + '---\n\n' + body;

  // 生成目标文件名
  const targetFilename = key.replace('freetools-', '') + '.md';
  const targetPath = path.join(TARGET_DIR, targetFilename);

  // 写入文件
  fs.writeFileSync(targetPath, newContent, 'utf8');

  return {
    source: filename,
    target: targetFilename,
    ...meta
  };
}

// 主函数
async function convert() {
  console.debug('🚀 开始转换 docs 文章...\n');
  console.debug(`源目录: ${SOURCE_DIR}`);
  console.debug(`目标目录: ${TARGET_DIR}\n`);

  const articles = readDocsArticles();
  const results = [];

  for (const article of articles) {
    const result = convertArticle(article);
    if (result) {
      results.push(result);
      console.debug(`✅ ${result.source} → ${result.target}`);
      console.debug(`   分类: ${result.category} | 标签: ${result.tags.join(', ')}`);
    }
  }

  console.debug(`\n✨ 转换完成！共转换 ${results.length} 篇文章`);
}

// 运行
convert();
