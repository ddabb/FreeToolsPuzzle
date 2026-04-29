/**
 * 重命名文档为中文文件名
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'know', 'source');

// 文件名映射
const FILE_RENAME_MAP = {
  '001-user-guide.md': '用户使用指南.md',
  '002-dev-philosophy.md': '开发思路.md',
  '003-usage-scenarios.md': '使用场景.md',
  '004-positioning.md': '产品定位.md',
  '004-positioning-pivot.md': '转型之路.md',
  '005-qclaw-best-practices.md': 'QClaw开发实践.md',
  '006-less-is-more.md': '少即是多.md',
  '007-data-story.md': '数据驱动产品决策.md',
  '008-free-is-expensive.md': '免费是最贵的.md',
  '009-cognitive-science.md': '认知科学解释工具焦虑.md',
  '010-midnight-coding.md': '深夜写代码.md',
  '011-zero-cost-opensource.md': '零成本开源.md',
  '012-dev-pitfalls.md': '开发踩坑记.md',
  '013-opensource-mit.md': 'MIT开源协议.md'
};

// 文章元数据
const ARTICLES = [
  {
    title: 'FreeTools 用户使用指南',
    filename: '用户使用指南.md',
    category: '产品使用',
    tags: ['使用指南', '教程', '工具宝']
  },
  {
    title: 'FreeTools 开发思路',
    filename: '开发思路.md',
    category: '产品设计',
    tags: ['开发', '技术选型', '产品']
  },
  {
    title: 'FreeTools 使用场景',
    filename: '使用场景.md',
    category: '产品设计',
    tags: ['使用场景', '用户场景']
  },
  {
    title: 'FreeTools 产品定位',
    filename: '产品定位.md',
    category: '产品设计',
    tags: ['产品定位', '差异化', '竞品分析']
  },
  {
    title: 'FreeTools 转型之路',
    filename: '转型之路.md',
    category: '产品设计',
    tags: ['产品转型', '知识库', '产品迭代']
  },
  {
    title: 'QClaw AI 辅助开发最佳实践',
    filename: 'QClaw开发实践.md',
    category: '开发实践',
    tags: ['AI辅助', 'QClaw', '开发效率', '最佳实践']
  },
  {
    title: '少即是多：57个工具到5个核心',
    filename: '少即是多.md',
    category: '产品思考',
    tags: ['产品思考', '少即是多', '产品哲学']
  },
  {
    title: '数据说话：用数据驱动产品决策',
    filename: '数据驱动产品决策.md',
    category: '产品思考',
    tags: ['数据分析', '数据驱动', '产品优化']
  },
  {
    title: '免费是最贵的',
    filename: '免费是最贵的.md',
    category: '产品思考',
    tags: ['商业模式', '免费', '产品思考']
  },
  {
    title: '认知科学解释工具焦虑',
    filename: '认知科学解释工具焦虑.md',
    category: '产品思考',
    tags: ['认知科学', '心理学', '用户行为']
  },
  {
    title: '深夜写代码的人',
    filename: '深夜写代码.md',
    category: '开发者故事',
    tags: ['开发者', '编程', '程序人生']
  },
  {
    title: '零成本+开源：个人开发者的组合拳',
    filename: '零成本开源.md',
    category: '开发实践',
    tags: ['开源', '零成本', '开发者工具']
  },
  {
    title: '开发踩坑记',
    filename: '开发踩坑记.md',
    category: '开发实践',
    tags: ['踩坑', '问题解决', '开发经验']
  },
  {
    title: 'MIT 协议开源',
    filename: 'MIT开源协议.md',
    category: '开发实践',
    tags: ['开源', 'MIT协议', '许可证']
  }
];

// 重命名文件
function renameFiles() {
  console.debug('🚀 开始重命名文档...\n');

  let renamed = 0;
  
  for (const [oldName, newName] of Object.entries(FILE_RENAME_MAP)) {
    const oldPath = path.join(SOURCE_DIR, oldName);
    const newPath = path.join(SOURCE_DIR, newName);
    
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.debug(`✅ ${oldName} → ${newName}`);
      renamed++;
    } else {
      console.debug(`⚠️  文件不存在: ${oldName}`);
    }
  }
  
  console.debug(`\n✨ 重命名完成！共 ${renamed} 个文件`);
}

// 输出文章列表
function outputArticleList() {
  console.debug('\n📚 白天写的文章列表：\n');
  console.debug('| 序号 | 标题 | 分类 | 标签 |');
  console.debug('|:---|:---|:---|:---|');
  
  ARTICLES.forEach((article, index) => {
    const tags = article.tags.join('、');
    console.debug(`| ${index + 1} | ${article.title} | ${article.category} | ${tags} |`);
  });
  
  console.debug(`\n共 ${ARTICLES.length} 篇文章`);
}

// 主函数
function main() {
  renameFiles();
  outputArticleList();
}

main();
