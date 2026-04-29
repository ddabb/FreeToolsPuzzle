# 知识库构建系统

## 功能介绍

本系统用于将Markdown文件转换为小程序可用的JSON数据格式，主要用于 `f:\SelfJob\freetools\packages\knowledge` 分包的数据呈现。

## 目录结构

```
data/
├── know/                    # 知识库数据目录
│   ├── source/             # Markdown源文件目录
│   ├── category/           # 分类JSON文件目录
│   ├── detail/             # 文章详情JSON文件目录
│   ├── articles.json       # 文章列表和统计数据
│   ├── tags.json           # 标签统计数据
│   ├── index.json          # 首页索引数据
│   └── knowledge.json      # 知识库索引数据（与index.json相同）
├── build.js                # 构建脚本
├── package.json            # 依赖配置
└── README.md               # 说明文档
```

## 安装依赖

```bash
npm install
```

## 构建流程

1. 在 `know/source` 目录中添加Markdown文件
2. 运行构建脚本：
   ```bash
   npm run build
   ```
3. 构建脚本会自动生成以下文件：
   - `articles.json` - 包含所有文章信息和统计数据
   - `category/{分类名}.json` - 按分类组织的文章列表
   - `detail/{文章ID}.json` - 文章详情文件
   - `tags.json` - 标签统计数据
   - `index.json` 和 `knowledge.json` - 首页索引数据

## Markdown文件格式

Markdown文件需要包含Front-matter元数据，格式如下：

```markdown
---
title: 文章标题
description: 文章描述
category: 分类
 tags:
  - 标签1
  - 标签2
---

# 文章内容

...
```

## 数据访问

小程序通过CDN访问生成的JSON数据，CDN地址配置在小程序代码中：

```javascript
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/know/';
```

## 注意事项

1. 确保Markdown文件的Front-matter格式正确
2. 文章ID会自动生成，基于文章标题
3. 构建脚本会清空 `category` 和 `detail` 目录后重新生成文件
4. 生成的JSON文件会包含文章的元数据、内容和统计信息

## 示例

在 `know/source` 目录中添加 `test-article.md` 文件，运行构建脚本后会生成相应的JSON文件。