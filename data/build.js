const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 配置参数
const config = {
  // 源文件目录（Markdown文件）
  sourceDir: path.resolve(__dirname, 'source'),
  // 输出目录
  outputDir: path.resolve(__dirname, 'know'),
  // 分类输出目录
  categoryDir: path.resolve(__dirname, 'know', 'category'),
  // 标签输出目录
  tagDir: path.resolve(__dirname, 'know', 'tag'),
  // 详情输出目录
  detailDir: path.resolve(__dirname, 'know', 'detail'),
  // 标签输出文件
  tagsFile: path.resolve(__dirname, 'know', 'tags.json'),
  // 文章列表文件
  articlesFile: path.resolve(__dirname, 'know', 'articles.json'),
  // 首页索引文件
  indexFile: path.resolve(__dirname, 'know', 'index.json'),
  // 知识库索引文件
  knowledgeFile: path.resolve(__dirname, 'know', 'knowledge.json')
};

// 确保目录存在
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.debug(`Created directory: ${dirPath}`);
  }
}

// 递归清空目录（删除所有文件和子目录）
function emptyDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // 递归删除子目录
        emptyDirectory(filePath);
        fs.rmdirSync(filePath);
      } else {
        // 删除文件
        fs.unlinkSync(filePath);
      }
    });
  }
}

// 提取Front-matter元数据并计算字数
function extractFrontMatterAndCountWords(content) {
  const fmRegex = /^(\uFEFF)?(?:---|\+\+\+)\r?\n([\s\S]*?)\r?\n(?:---|\+\+\+)(?:\s*?$)/m;
  const match = content.match(fmRegex);

  let frontMatter = {};
  if (match) {
    try {
      frontMatter = yaml.load(match[2]);
    } catch (e) {
      console.warn('YAML解析错误:', e.message);
    }
  }

  // 计算正文部分的实际字数，忽略所有类型的空白字符
  const bodyText = content.substring(match ? match[0].length : 0);
  const wordCount = bodyText.replace(/\s+/g, '').length;
  return { frontMatter, wordCount, body: bodyText };
}

// 生成分类/标签统计
function generateTaxonomy(items, field) {
  return items.reduce((acc, item) => {
    const values = Array.isArray(item[field]) ? item[field] : [item[field]];
    values.forEach(value => {
      if (value) acc[value] = (acc[value] || 0) + 1;
    });
    return acc;
  }, {});
}

// 生成文章ID
function generateArticleId(title) {
  let id = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // 如果ID为空，使用时间戳生成唯一ID
  if (!id) {
    id = 'article-' + Date.now();
  }
  
  return id;
}

// 主构建函数
async function build() {
  console.debug('开始构建知识库...');

  // 确保目录存在
  ensureDirectory(config.sourceDir);

  // 清空整个 know 输出目录
  if (fs.existsSync(config.outputDir)) {
    emptyDirectory(config.outputDir);
    console.debug('✅ 已清空输出目录');
  }

  // 确保子目录存在
  ensureDirectory(config.categoryDir);
  ensureDirectory(config.tagDir);
  ensureDirectory(config.detailDir);

  try {
    // 读取并处理Markdown文件
    const mdFiles = fs.readdirSync(config.sourceDir, { withFileTypes: true })
      .filter(file => file.isFile() && path.extname(file.name) === '.md')
      .map(file => {
        const filePath = path.join(config.sourceDir, file.name);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const { frontMatter, wordCount, body } = extractFrontMatterAndCountWords(content);

        const title = frontMatter.title || path.basename(file.name, '.md');
        const id = generateArticleId(title);
        const filename = path.basename(file.name, '.md') + '.json';

        return {
          id,
          name: file.name,
          filename,
          title,
          description: frontMatter.description || '',
          category: frontMatter.category || '未分类',
          tags: Array.isArray(frontMatter.tags) ? frontMatter.tags.map(tag => String(tag).trim()).filter(Boolean) : (typeof frontMatter.tags === 'string' ? frontMatter.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []),
          wordCount,
          body,
          birthtime: stats.birthtime,
          updateTime: stats.mtime
        };
      });

    // 按修改时间排序
    mdFiles.sort((a, b) => b.updateTime - a.updateTime);
    mdFiles.forEach((file, index) => file.order = index + 1);

    // 生成统计数据
    const taxonomy = {
      categories: generateTaxonomy(mdFiles, 'category'),
      tags: generateTaxonomy(mdFiles, 'tags')
    };

    // 生成文章列表数据
    const articlesData = {
      meta: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        totalArticles: mdFiles.length,
        totalCategories: Object.keys(taxonomy.categories).length,
        totalTags: Object.keys(taxonomy.tags).length
      },
      taxonomy,
      articles: mdFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        title: file.title,
        description: file.description,
        category: file.category,
        tags: file.tags,
        wordCount: file.wordCount,
        birthtime: file.birthtime,
        updateTime: file.updateTime,
        order: file.order
      }))
    };

    // 写入文章列表文件
    fs.writeFileSync(config.articlesFile, JSON.stringify(articlesData, null, 2));
    console.debug(`✅ 已更新: ${config.articlesFile}`);

    // 生成分类文件
    Object.keys(taxonomy.categories).forEach(category => {
      const articlesInCategory = mdFiles.filter(file => file.category === category);
      const categoryData = {
        meta: {
          category,
          count: articlesInCategory.length,
          generatedAt: new Date().toISOString()
        },
        articles: articlesInCategory.map(file => ({
          id: file.id,
          filename: file.filename,
          title: file.title,
          description: file.description,
          tags: file.tags,
          wordCount: file.wordCount,
          updateTime: file.updateTime,
          order: file.order
        }))
      };
      const categoryFileName = `${category}.json`;
      const categoryFilePath = path.join(config.categoryDir, categoryFileName);
      fs.writeFileSync(categoryFilePath, JSON.stringify(categoryData, null, 2));
      console.debug(`✅ 已生成分类文件: ${categoryFilePath}`);
    });

    // 生成标签文件
    Object.keys(taxonomy.tags).forEach(tag => {
      const articlesWithTag = mdFiles.filter(file => file.tags.includes(tag));
      const tagData = {
        meta: {
          tag,
          count: articlesWithTag.length,
          generatedAt: new Date().toISOString()
        },
        articles: articlesWithTag.map(file => ({
          id: file.id,
          filename: file.filename,
          title: file.title,
          description: file.description,
          category: file.category,
          wordCount: file.wordCount,
          updateTime: file.updateTime,
          order: file.order
        }))
      };
      const tagFileName = `${tag}.json`;
      const tagFilePath = path.join(config.tagDir, tagFileName);
      fs.writeFileSync(tagFilePath, JSON.stringify(tagData, null, 2));
      console.debug(`✅ 已生成标签文件: ${tagFilePath}`);
    });

    // 生成文章详情文件
    mdFiles.forEach(file => {
      const detailData = {
        id: file.id,
        filename: file.filename,
        title: file.title,
        description: file.description,
        category: file.category,
        tags: file.tags,
        wordCount: file.wordCount,
        birthtime: file.birthtime,
        updateTime: file.updateTime,
        content: file.body
      };
      // 使用源文件名（去除.md扩展名）作为JSON文件名
      const detailFileName = path.basename(file.name, '.md') + '.json';
      const detailFilePath = path.join(config.detailDir, detailFileName);
      fs.writeFileSync(detailFilePath, JSON.stringify(detailData, null, 2));
      console.debug(`✅ 已生成详情文件: ${detailFilePath}`);
    });

    // 生成标签文件
    const tagsData = {
      meta: {
        totalTags: Object.keys(taxonomy.tags).length,
        generatedAt: new Date().toISOString()
      },
      tags: Object.keys(taxonomy.tags).map(tag => ({
        name: tag,
        count: taxonomy.tags[tag]
      })).sort((a, b) => b.count - a.count)
    };
    fs.writeFileSync(config.tagsFile, JSON.stringify(tagsData, null, 2));
    console.debug(`✅ 已更新: ${config.tagsFile}`);

    // 生成首页索引文件
    const indexData = {
      meta: {
        generatedAt: new Date().toISOString(),
        totalArticles: mdFiles.length,
        totalCategories: Object.keys(taxonomy.categories).length,
        totalTags: Object.keys(taxonomy.tags).length
      },
      categories: Object.keys(taxonomy.categories).map(category => ({
        name: category,
        count: taxonomy.categories[category]
      })).sort((a, b) => b.count - a.count),
      recentArticles: mdFiles.slice(0, 5).map(file => ({
        id: file.id,
        filename: file.filename,
        title: file.title,
        description: file.description,
        category: file.category,
        updateTime: file.updateTime
      })),
      popularTags: Object.keys(taxonomy.tags)
        .sort((a, b) => taxonomy.tags[b] - taxonomy.tags[a])
        .slice(0, 10)
    };
    fs.writeFileSync(config.indexFile, JSON.stringify(indexData, null, 2));
    console.debug(`✅ 已更新: ${config.indexFile}`);

    // 生成知识库索引文件（与index.json相同，保持兼容性）
    fs.writeFileSync(config.knowledgeFile, JSON.stringify(indexData, null, 2));
    console.debug(`✅ 已更新: ${config.knowledgeFile}`);

    console.debug('\n📊 构建统计:');
    console.debug(`📄 文章总数: ${mdFiles.length}篇`);
    console.debug(`📂 分类数量: ${Object.keys(taxonomy.categories).length}个`);
    console.debug(`🏷️ 标签数量: ${Object.keys(taxonomy.tags).length}个`);
    console.debug('\n✅ 知识库构建完成！');

  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

// 运行构建
if (require.main === module) {
  build();
}

module.exports = { build };