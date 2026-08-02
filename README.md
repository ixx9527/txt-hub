# TXT Hub

EPUB 书籍管理平台，支持上传、阅读、收藏，内置 TXT 转 EPUB 制书工具。

在线地址：[txthub.ixx9527.xin](https://txthub.ixx9527.xin)

## 功能

### 书库

- 浏览全站书籍，支持搜索（书名/作者）、分类筛选、排序
- 书籍详情页展示元数据、目录、简介、标签

### 阅读

- 在线阅读 EPUB 书籍，支持章节导航、书签、文本高亮
- 阅读进度自动保存，再次打开恢复上次阅读位置
- 阅读设置：字体大小、行距、主题（白天/护眼/夜间）
- 目录分级显示（卷 > 章）

### 我的书架

- 收藏书籍，管理阅读状态（想读/在读/读过）
- 阅读进度和百分比自动记录

### 制书（TXT 转 EPUB）

- 上传 TXT 文件，自动检测编码（GBK、UTF-8、Big5 等）
- 智能章节识别（第X章/节/回/卷，支持两级目录结构）
- 文本清洗（删除首尾空格、合并空行）
- 封面生成：Canvas 主题封面 / AI 生图 / 自定义上传
- 章节目录预览
- 导出标准 EPUB 3.0 格式，可一键上传到书库

### 游客权限

- 游客可浏览书库和书籍详情
- 阅读、下载、收藏、上传、制书等功能需登录

## 开发

```bash
# 安装依赖
npm install

# 启动后端（需要配置环境变量）
JWT_SECRET=xxx AI_SERVICE_TOKEN=xxx AI_SERVICE_URL=xxx npx tsx server/index.ts

# 启动前端开发服务器（另一个终端）
npm run dev
```

前端开发服务器会自动将 `/api` 请求代理到后端。

## 部署

### 环境变量

后端通过系统环境变量读取配置（不使用 `.env` 文件）：

| 变量 | 说明 | 必填 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥，未设置时服务拒绝启动 | 是 |
| `AI_SERVICE_TOKEN` | AI 封面生成的 API Key | 否 |
| `AI_SERVICE_URL` | AI 封面生成的 API 端点 | 否 |
| `CORS_ORIGIN` | 允许的前端域名，默认 `https://txthub.ixx9527.xin` | 否 |

### 一键部署

```bash
npm run deploy
```

执行：前端构建 → 复制 dist 到 nginx 静态目录 → 检测 nginx 配置 → 重载 nginx。

后端需单独重启（`npx tsx server/index.ts` 或 systemd 管理）。

### 架构

- **前端**：Vite SPA，nginx 静态托管（`/var/www/txthub`）
- **后端**：Express + TypeScript，监听 `127.0.0.1:3847`，nginx 反代 `/api/`
- **数据库**：SQLite（`data/txthub.db`）
- **HTTPS**：Let's Encrypt + Certbot

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Express + TypeScript + sql.js (SQLite)
- **核心库**：JSZip（EPUB 解析/生成）、bcryptjs（密码哈希）、encoding-japanese（编码检测）
