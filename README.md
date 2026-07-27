# TXT Hub

将 TXT 文本格式化并转换为 EPUB 的工具。

## 功能

- 自动识别文本编码（GBK、UTF-8、Big5 等）
- 文本清洗（删除首尾空格、合并空行）
- 章节智能识别（第X章/节/回、Chapter N、数字序号）
- 支持两级目录结构（卷 > 章）
- 封面生成：Canvas 主题封面 / AI 生图 / 自定义上传
- 导出标准 EPUB 3.0 格式

## 开发

前端和后端需要分别启动：

```bash
# 安装依赖
npm install

# 启动后端（需要配置环境变量）
AI_SERVICE_TOKEN=xxx AI_SERVICE_URL=xxx npx tsx server/index.ts

# 启动前端（另一个终端）
npm run dev
```

前端开发服务器会自动将 `/api` 请求代理到后端。

## 部署

服务器：`https://txthub.ixx9527.xin`

### 环境变量

后端通过系统环境变量读取配置（不使用 `.env` 文件）：

| 变量 | 说明 |
|------|------|
| `AI_SERVICE_TOKEN` | AI 生图服务的 API Key |
| `AI_SERVICE_URL` | AI 生图服务的 API 端点 |

### 后端服务

使用 systemd 管理，配置文件 `/etc/systemd/system/txthub-api.service`：

```bash
systemctl start txthub-api    # 启动
systemctl status txthub-api   # 查看状态
systemctl restart txthub-api  # 重启
```

后端监听 `127.0.0.1:3847`，通过 nginx 反向代理 `/api/` 路径。

### 前端构建

```bash
npm run build
rm -rf /var/www/txthub/* && cp -r dist/* /var/www/txthub/ && chown -R nginx:nginx /var/www/txthub
```

### Nginx 配置

配置文件：`/etc/nginx/conf.d/txthub.conf`

- 网站根目录：`/var/www/txthub`
- `/api/` 反向代理到后端 Express 服务
- HTTPS 证书：Let's Encrypt，自动续期
- HTTP 自动 301 跳转 HTTPS
- 静态资源缓存 1 年

### 证书续期

```bash
certbot renew --dry-run  # 测试续期
certbot renew            # 手动续期
```

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS + JSZip
- **后端**：Express + TypeScript（AI 封面生成代理）
