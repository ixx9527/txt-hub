# TXT Hub

将 TXT 文本格式化并转换为 EPUB 的纯前端工具。

## 功能

- 自动识别文本编码（GBK、UTF-8、Big5 等）
- 文本清洗（删除首尾空格、合并空行）
- 章节智能识别（第X章/节/回、Chapter N、数字序号）
- 支持两级目录结构（卷 > 章）
- 自动生成或自定义上传封面
- 导出标准 EPUB 3.0 格式

## 开发

```bash
npm install
npm run dev
```

## 部署

服务器：`https://txthub.ixx9527.xin`

### 构建并部署

```bash
# 构建
npm run build

# 同步构建产物到 nginx 目录
cp -r dist/* /var/www/txthub/ && chown -R nginx:nginx /var/www/txthub
```

### Nginx 配置

配置文件：`/etc/nginx/conf.d/txthub.conf`

- 网站根目录：`/var/www/txthub`
- HTTPS 证书：Let's Encrypt，自动续期
- HTTP 自动 301 跳转 HTTPS
- 静态资源缓存 1 年

### 证书续期

```bash
certbot renew --dry-run  # 测试续期
certbot renew            # 手动续期
```

## 技术栈

React + TypeScript + Vite + Tailwind CSS + JSZip
