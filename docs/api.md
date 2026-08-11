# TXT Hub API 文档

**Base URL:** `http://127.0.0.1:3847`  
**生产域名:** `https://txthub.ixx9527.xin`

---

## 目录

- [认证机制](#认证机制)
- [通用说明](#通用说明)
- [Auth - 用户认证](#auth---用户认证)
- [Books - 书籍管理](#books---书籍管理)
- [Shelf - 书架](#shelf---书架)
- [Categories - 分类](#categories---分类)
- [Tags - 标签](#tags---标签)
- [Reader - 阅读器](#reader---阅读器)
- [Sync - 增量同步](#sync---增量同步)
- [Reading Sessions - 阅读统计](#reading-sessions---阅读统计)
- [User Settings - 用户设置](#user-settings---用户设置)
- [Convert - TXT 转 EPUB](#convert---txt-转-epub)
- [AI 封面生成](#ai-封面生成)
- [Health](#health)

---

## 认证机制

除少数公开接口外，所有接口需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

Token 通过 `/api/auth/register` 或 `/api/auth/login` 获取，有效期 **7 天**。

Token payload 结构：

```json
{
  "userId": 1,
  "username": "string",
  "role": "user | admin"
}
```

---

## 通用说明

### 请求格式

- `Content-Type: application/json`（文件上传除外，使用 `multipart/form-data`）
- JSON body 最大 **1MB**

### 响应格式

成功响应直接返回数据对象，错误响应统一格式：

```json
{ "error": "错误描述" }
```

### 常见状态码

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录 / Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（已存在） |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

---

## Auth - 用户认证

### POST `/api/auth/register`

注册新用户。

**请求体：**

```json
{
  "username": "string (2-30 字符)",
  "email": "string (合法邮箱格式)",
  "password": "string (至少 6 字符)"
}
```

**响应 `201`：**

```json
{
  "token": "jwt-string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

**错误：**
- `400` — 参数缺失 / 格式错误
- `409` — 用户名或邮箱已被注册

---

### POST `/api/auth/login`

用户登录。

**请求体：**

```json
{
  "login": "string (用户名或邮箱)",
  "password": "string"
}
```

**响应 `200`：**

```json
{
  "token": "jwt-string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "user"
  }
}
```

**错误：**
- `400` — 参数缺失
- `401` — 用户名或密码错误

---

### GET `/api/auth/me`

获取当前登录用户信息。**需要认证。**

**响应 `200`：**

```json
{
  "id": 1,
  "username": "string",
  "email": "string",
  "role": "user",
  "created_at": "2025-01-01 00:00:00"
}
```

---

## Books - 书籍管理

### POST `/api/books/upload`

上传书籍文件（EPUB 或 TXT）。**需要认证。**

**请求：** `multipart/form-data`

| 字段 | 类型 | 说明 |
|------|------|------|
| `file` | File | EPUB 或 TXT 文件，最大 100MB |

**响应 `201`：**

```json
{
  "id": 1,
  "title": "书名",
  "format": "epub"
}
```

上传时自动计算文件 SHA256 哈希并存入 `content_hash` 字段，用于去重。

---

### GET `/api/books/by-hash/:sha256`

按内容哈希查找书籍（去重）。**需要认证。** 仅查找当前用户的书籍。

**响应 `200`：**

```json
{
  "id": 1,
  "title": "string",
  "author": "string",
  "file_format": "epub",
  "file_size": 123456,
  "content_hash": "sha256:abc123...",
  "created_at": "2025-01-01 00:00:00"
}
```

**错误：**
- `404` — 未找到匹配书籍

---

### GET `/api/books`

获取书籍列表（分页）。**需要认证。** 仅返回当前用户上传的书籍。

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页数量（最大 50） |
| `sort` | string | `created_at` | 排序字段：`created_at` / `title` / `author` |
| `order` | string | `desc` | 排序方向：`asc` / `desc` |
| `category` | number | — | 按分类 ID 筛选 |
| `tag` | number | — | 按标签 ID 筛选 |
| `q` | string | — | 搜索书名或作者 |

**响应 `200`：**

```json
{
  "books": [
    {
      "id": 1,
      "title": "string",
      "author": "string",
      "description": "string | null",
      "cover_path": "string | null",
      "file_format": "epub",
      "file_size": 123456,
      "language": "zh-CN",
      "created_at": "2025-01-01 00:00:00",
      "categories": ["分类1", "分类2"],
      "tags": ["标签1"],
      "read_status": "reading | finished | want | null",
      "read_progress": 0.5,
      "last_read_at": "2025-01-02 00:00:00 | null"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### GET `/api/books/search`

全局搜索章节内容。**需要认证。**

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词 |

**响应 `200`：**

```json
{
  "results": [
    {
      "book_id": 1,
      "chapter_id": "chapter-1",
      "chapter_title": "第一章",
      "snippet": "...匹配的文本片段..."
    }
  ]
}
```

最多返回 50 条结果。

---

### GET `/api/books/:id`

获取书籍详情。**需要认证。**

**响应 `200`：**

```json
{
  "id": 1,
  "title": "string",
  "author": "string",
  "publisher": "string | null",
  "description": "string | null",
  "language": "zh-CN",
  "isbn": "string | null",
  "cover_path": "string | null",
  "file_path": "uploads/xxx.epub",
  "file_format": "epub",
  "file_size": 123456,
  "upload_user_id": 1,
  "created_at": "2025-01-01 00:00:00",
  "updated_at": "2025-01-01 00:00:00",
  "categories": [
    { "id": 1, "name": "分类名" }
  ],
  "tags": [
    { "id": 1, "name": "标签名" }
  ],
  "chapters": [
    { "id": "chapter-1", "title": "第一章", "sort_order": 0, "level": 2 }
  ],
  "last_chapter_id": "chapter-5 | null"
}
```

`chapters` 中 `level` 含义：`0` = 未分类，`1` = 卷级别，`2` = 章级别。

---

### PUT `/api/books/:id`

更新书籍元信息。**需要认证。** 仅书籍所有者或管理员可操作。

**请求体（所有字段可选）：**

```json
{
  "title": "string",
  "author": "string",
  "publisher": "string",
  "description": "string",
  "language": "string",
  "isbn": "string"
}
```

**响应 `200`：**

```json
{ "success": true }
```

---

### DELETE `/api/books/:id`

删除书籍。**需要认证。** 仅书籍所有者或管理员可操作。同时删除关联的文件和封面。

**响应 `200`：**

```json
{ "success": true }
```

---

### DELETE `/api/books/:id/cloud`

删除云端文件（硬删除）。**需要认证。** 删除书籍记录、关联文件和封面，并写入删除墓碑（`delete_type=file`）供增量同步使用。

**响应 `200`：**

```json
{ "success": true }
```

**错误：**
- `403` — 无权删除
- `404` — 书籍不存在

---

### GET `/api/books/:id/download`

下载书籍文件。**需要认证。**

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `format` | string | `epub` | 目标格式：`epub` / `txt` |

支持格式转换：EPUB 文件可下载为 TXT，TXT 书籍可下载为服务端动态生成的 EPUB（含自动章节解析和封面生成）。

**响应：** 文件下载流

---

### GET `/api/books/:id/cover`

获取书籍封面图片。**需要认证。**

**响应：** 图片文件流

---

## Shelf - 书架

所有接口**需要认证**。

### GET `/api/shelf`

获取书架列表。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 筛选状态：`reading` / `finished` / `want` |

**响应 `200`：**

```json
{
  "books": [
    {
      "id": 1,
      "title": "string",
      "author": "string",
      "cover_path": "string | null",
      "file_format": "epub",
      "status": "reading",
      "progress": 0.5,
      "last_read_at": "2025-01-02 00:00:00",
      "added_at": "2025-01-01 00:00:00"
    }
  ]
}
```

---

### POST `/api/shelf`

添加书籍到书架。

**请求体：**

```json
{ "book_id": 1 }
```

**响应 `201`：**

```json
{ "success": true }
```

**错误：**
- `400` — 缺少 `book_id`
- `409` — 已在书架中

---

### DELETE `/api/shelf/:bookId`

从书架移除书籍（软删除）。会写入删除墓碑（`delete_type=shelf`）供增量同步使用，同时清除用户的阅读进度记录。

**响应 `200`：**

```json
{ "success": true }
```

---

### GET `/api/shelf/:bookId/progress`

获取精确阅读进度。**需要认证。**

**响应 `200`：**

```json
{
  "progress": 0.75,
  "locator": "{\"type\":\"ReadingProgression\",\"href\":\"chapter-2\",\"locations\":{\"progression\":0.5}}",
  "current_cfi": "epubcfi(/6/4...) | null",
  "status": "reading",
  "version": 3,
  "updated_at": "2026-08-03 12:00:00",
  "last_chapter_id": "chapter-5 | null"
}
```

`locator` 为通用 Readium Locator JSON 字符串，适用于任意格式的定位。`current_cfi` 为向后兼容的 EPUB CFI 字段。`version` 为乐观并发版本号，每次更新递增。

**错误：**
- `404` — 未找到阅读进度

---

### PUT `/api/shelf/:bookId/progress`

更新阅读进度（upsert）。**需要认证。**

**请求头（可选）：**

| 头部 | 说明 |
|------|------|
| `If-Match` | 客户端已知的 `version` 值（带引号，如 `"3"`）。用于冲突检测。 |

**请求体（所有字段可选）：**

```json
{
  "progress": 0.75,
  "locator": "{\"type\":\"ReadingProgression\",\"href\":\"chapter-2\"}",
  "current_cfi": "epubcfi(/6/4...)",
  "status": "reading",
  "last_chapter_id": "chapter-5"
}
```

**响应 `200`：**

```json
{
  "success": true,
  "version": 4,
  "updated_at": "2026-08-03 12:05:00"
}
```

**冲突检测：** 当提供 `If-Match` 头部时，服务端会比较版本号。匹配则更新成功并返回新 `version`；不匹配则返回 `409`：

```json
{
  "error": "版本冲突",
  "server_version": 5
}
```

---

### GET `/api/shelf/:bookId/tts-progress`

获取 TTS 朗读位置。**需要认证。**

**响应 `200`：**

```json
{
  "locator": "{\"href\":\"chapter-3\",\"offset\":1234}",
  "updated_at": "2026-08-03 12:00:00"
}
```

**错误：**
- `404` — 未找到 TTS 进度

---

### PUT `/api/shelf/:bookId/tts-progress`

更新 TTS 朗读位置（upsert）。**需要认证。**

**请求体：**

```json
{
  "locator": "{\"href\":\"chapter-3\",\"offset\":1234}"
}
```

`locator` 为必填字段，存储完整的 Readium Locator JSON。

**响应 `200`：**

```json
{ "success": true }
```

**错误：**
- `400` — 缺少 `locator`

---

## Categories - 分类

### GET `/api/categories`

获取分类树。**无需认证。**

**响应 `200`：**

```json
{
  "categories": [
    {
      "id": 1,
      "name": "文学",
      "parent_id": null,
      "children": [
        { "id": 2, "name": "小说", "parent_id": 1, "children": [] }
      ]
    }
  ]
}
```

---

### POST `/api/categories`

创建分类。**需要管理员权限。**

**请求体：**

```json
{
  "name": "string (1-50 字符)",
  "parent_id": 1
}
```

**响应 `201`：**

```json
{ "success": true }
```

**错误：**
- `400` — 名称无效
- `409` — 分类名已存在

---

### PUT `/api/categories/:id`

更新分类。**需要管理员权限。**

**请求体（所有字段可选）：**

```json
{
  "name": "string",
  "parent_id": 1,
  "sort_order": 0
}
```

**响应 `200`：**

```json
{ "success": true }
```

---

### DELETE `/api/categories/:id`

删除分类。**需要管理员权限。** 子分类的 `parent_id` 会被设为 `null`。

**响应 `200`：**

```json
{ "success": true }
```

---

### POST `/api/categories/:id/books`

将书籍分配到分类。**需要认证。**

**请求体：**

```json
{ "book_id": 1 }
```

**响应 `200`：**

```json
{ "success": true }
```

---

### DELETE `/api/categories/:id/books/:bookId`

从分类中移除书籍。**需要认证。**

**响应 `200`：**

```json
{ "success": true }
```

---

## Tags - 标签

### GET `/api/tags`

获取所有标签及其书籍数量。**无需认证。**

**响应 `200`：**

```json
{
  "tags": [
    { "id": 1, "name": "科幻", "book_count": 5 }
  ]
}
```

按 `book_count` 降序排列。

---

### POST `/api/tags`

创建标签。**需要认证。** 如果标签名已存在，直接返回已有标签（不报错）。

**请求体：**

```json
{ "name": "string (1-30 字符)" }
```

**响应 `200` / `201`：**

```json
{ "id": 1, "name": "科幻" }
```

---

### DELETE `/api/tags/:id`

删除标签。**需要认证。** 同时移除所有书籍-标签关联。

**响应 `200`：**

```json
{ "success": true }
```

---

### POST `/api/tags/:id/books`

为书籍添加标签。**需要认证。**

**请求体：**

```json
{ "book_id": 1 }
```

**响应 `200`：**

```json
{ "success": true }
```

---

### DELETE `/api/tags/:id/books/:bookId`

从书籍移除标签。**需要认证。**

**响应 `200`：**

```json
{ "success": true }
```

---

## Reader - 阅读器

### GET `/api/reader/:bookId/chapters/:chapterId`

获取章节内容。**需要认证。** 仅书籍所有者可访问。

**响应 `200`：**

```json
{
  "id": "chapter-1",
  "title": "第一章",
  "content": "章节正文..."
}
```

返回的 `content` 已去除开头重复的标题文本。

---

### GET `/api/reader/:bookId/search`

书籍内部搜索。**需要认证。** 仅书籍所有者可访问。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词 |

**响应 `200`：**

```json
{
  "results": [
    {
      "chapter_id": "chapter-1",
      "chapter_title": "第一章",
      "snippet": "...匹配片段..."
    }
  ]
}
```

最多返回 50 条。

---

### GET `/api/reader/:bookId/bookmarks`

获取书签列表。**需要认证。**

**响应 `200`：**

```json
{
  "bookmarks": [
    {
      "id": 1,
      "chapter_id": "chapter-1",
      "cfi": "epubcfi(/6/4...)",
      "note": "备注文字",
      "created_at": "2025-01-01 00:00:00"
    }
  ]
}
```

---

### POST `/api/reader/:bookId/bookmarks`

创建书签。**需要认证。**

**请求体：**

```json
{
  "chapter_id": "chapter-1",
  "cfi": "epubcfi(/6/4...)",
  "note": "备注"
}
```

所有字段可选。

**响应 `201`：**

```json
{ "success": true }
```

---

### DELETE `/api/reader/:bookId/bookmarks/:id`

删除书签。**需要认证。**

**响应 `200`：**

```json
{ "success": true }
```

---

### GET `/api/reader/:bookId/highlights`

获取高亮列表。**需要认证。**

**响应 `200`：**

```json
{
  "highlights": [
    {
      "id": 1,
      "chapter_id": "chapter-1",
      "cfi": "epubcfi(/6/4...)",
      "text": "高亮的原文",
      "color": "yellow",
      "note": "批注",
      "created_at": "2025-01-01 00:00:00"
    }
  ]
}
```

---

### POST `/api/reader/:bookId/highlights`

创建高亮。**需要认证。**

**请求体：**

```json
{
  "chapter_id": "chapter-1",
  "cfi": "epubcfi(/6/4...)",
  "text": "高亮原文",
  "color": "yellow",
  "note": "批注"
}
```

`color` 默认 `yellow`，其余字段可选。

**响应 `201`：**

```json
{ "success": true }
```

---

### DELETE `/api/reader/:bookId/highlights/:id`

删除高亮。**需要认证。**

**响应 `200`：**

```json
{ "success": true }
```

---

## Sync - 增量同步

所有接口**需要认证**。

### GET `/api/sync`

增量同步接口。返回自 `cursor` 时间戳以来的所有变更，包括新增书籍、进度变化、TTS 位置变化和删除记录。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `cursor` | string | ISO 8601 时间戳。不传则返回全量数据（初始同步）。 |

**响应 `200`：**

```json
{
  "books": [
    {
      "id": 1,
      "title": "string",
      "author": "string",
      "file_format": "epub",
      "file_size": 123456,
      "content_hash": "sha256:abc123...",
      "cover_path": "string | null",
      "created_at": "2026-08-01 10:00:00",
      "updated_at": "2026-08-03 12:00:00"
    }
  ],
  "progress_changes": [
    {
      "book_id": 1,
      "progress": 0.75,
      "locator": "{\"href\":\"chapter-2\"}",
      "current_cfi": "epubcfi(/6/4...) | null",
      "status": "reading",
      "version": 3,
      "last_chapter_id": "chapter-5 | null",
      "updated_at": "2026-08-03 12:00:00"
    }
  ],
  "tts_changes": [
    {
      "book_id": 1,
      "locator": "{\"href\":\"chapter-3\",\"offset\":1234}",
      "updated_at": "2026-08-03 12:00:00"
    }
  ],
  "deleted_book_ids": [
    {
      "book_id": 2,
      "delete_type": "shelf",
      "deleted_at": "2026-08-03 11:00:00"
    }
  ],
  "next_cursor": "2026-08-03 12:00:00"
}
```

**字段说明：**

- `books` — 新增或更新的书籍（`created_at > cursor` 或 `updated_at > cursor`）
- `progress_changes` — 阅读进度变更（`user_books.updated_at > cursor`）
- `tts_changes` — TTS 位置变更（`tts_progress.updated_at > cursor`）
- `deleted_book_ids` — 删除墓碑，`delete_type` 区分删除类型：
  - `shelf` — 仅移出书架（书籍文件仍在云端）
  - `file` — 删除了云端文件
- `next_cursor` — 本次返回中最大的时间戳，用作下次请求的 `cursor`

---

## Reading Sessions - 阅读统计

所有接口**需要认证**。

### POST `/api/reading-sessions/batch`

批量写入阅读会话记录。**需要认证。** 使用客户端生成的 UUID 作为主键，支持幂等重试。

**请求体：**

```json
{
  "sessions": [
    {
      "id": "uuid-string",
      "book_id": 1,
      "started_at": "2026-08-03T10:00:00Z",
      "ended_at": "2026-08-03T10:30:00Z",
      "duration_seconds": 1800
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 客户端生成的 UUID，用于幂等去重 |
| `book_id` | number | 是 | 书籍 ID |
| `started_at` | string | 是 | ISO 8601 开始时间 |
| `ended_at` | string | 否 | ISO 8601 结束时间 |
| `duration_seconds` | number | 否 | 持续时长（秒） |

**响应 `200`：**

```json
{
  "success": true,
  "inserted": 2,
  "skipped": 0
}
```

`skipped` 为已存在（重复 ID）或字段缺失而跳过的记录数。

---

### GET `/api/reading-sessions`

增量拉取阅读会话记录。**需要认证。**

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `updated_after` | string | ISO 8601 时间戳。不传则返回全部记录。 |

**响应 `200`：**

```json
{
  "sessions": [
    {
      "id": "uuid-string",
      "book_id": 1,
      "started_at": "2026-08-03T10:00:00Z",
      "ended_at": "2026-08-03T10:30:00Z",
      "duration_seconds": 1800,
      "created_at": "2026-08-03 10:30:00"
    }
  ]
}
```

最多返回 500 条。

---

## User Settings - 用户设置

所有接口**需要认证**。

### GET `/api/user/reader-settings`

获取当前用户的所有阅读设置。**需要认证。**

**响应 `200`：**

```json
{
  "settings": {
    "theme": { "value": "dark", "updated_at": "2026-08-03 12:00:00" },
    "fontSize": { "value": "18", "updated_at": "2026-08-03 12:00:00" },
    "lineHeight": { "value": "1.6", "updated_at": "2026-08-03 12:00:00" },
    "ttsVoice": { "value": "zh-CN", "updated_at": "2026-08-03 12:00:00" },
    "ttsRate": { "value": "1.2", "updated_at": "2026-08-03 12:00:00" }
  }
}
```

---

### PUT `/api/user/reader-settings`

批量更新阅读设置（upsert）。**需要认证。** 传入的键值对会合并到现有设置中，已有的键会被覆盖。

**请求体：**

```json
{
  "settings": {
    "theme": "dark",
    "fontSize": "18",
    "lineHeight": "1.6",
    "ttsVoice": "zh-CN",
    "ttsRate": "1.2"
  }
}
```

键名和值均为字符串，客户端自定义。

**响应 `200`：**

```json
{ "success": true }
```

---

## Convert - TXT 转 EPUB

所有接口**需要认证**。

### POST `/api/convert/txt-to-epub`

将 TXT 文件转换为 EPUB 并返回文件流。不入库，纯格式转换。

**请求：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | TXT 文件，最大 100MB |
| `title` | string | 否 | 书名（默认取文件名） |
| `author` | string | 否 | 作者（默认"佚名"） |
| `language` | string | 否 | 语言代码（默认 `zh-CN`） |
| `coverMode` | string | 否 | 封面模式：`random`（默认）/ `ai` / `none` |
| `coverTheme` | string | 否 | 指定主题 ID（见下方主题列表） |
| `aiStyle` | string | 否 | AI 封面风格描述（仅 `coverMode=ai` 时有效） |

**可用主题 ID：** `midnight`、`ember`、`forest`、`wine`、`slate`、`dusk`、`ocean`、`charcoal`、`autumn`、`jade`

**响应 `200`：** EPUB 文件下载流（`application/epub+zip`）

**错误：**
- `400` — 未选择文件 / 非 TXT 文件
- `500` — 转换失败

---

### POST `/api/convert/txt-to-epub-and-store`

将 TXT 文件转换为 EPUB 并入库保存。自动解析章节、生成封面、计算内容哈希。

**请求：** `multipart/form-data`

参数与 `/api/convert/txt-to-epub` 相同。

**响应 `201`：**

```json
{
  "id": 1,
  "title": "书名",
  "format": "epub"
}
```

入库操作包括：
- 解析 TXT 章节结构（复用客户端章节解析器）
- 生成 EPUB 文件并保存
- 生成封面图片（随机主题或 AI）
- 计算内容 SHA256 哈希（用于去重）
- 写入书籍记录和章节索引

**错误：**
- `400` — 未选择文件 / 非 TXT 文件
- `500` — 转换或入库失败

---

## AI 封面生成

### POST `/api/generate-cover`

使用 AI 生成书籍封面。无需认证，但受频率限制。

**频率限制：**
- 每分钟最多 3 次
- 每小时最多 15 次
- 服务器最多同时处理 3 个请求

**请求体：**

```json
{
  "title": "string (必填, 最多 100 字)",
  "author": "string (可选, 最多 100 字)",
  "style": "string (可选, 最多 500 字)"
}
```

**响应 `200`：**

```json
{
  "image": "base64-encoded-png",
  "mimeType": "image/png"
}
```

**错误：**
- `400` — 参数无效
- `429` — 请求频率超限 / 服务器繁忙
- `500` — 生成失败
- `503` — AI 服务未配置

---

## Health

### GET `/api/health`

健康检查。无需认证。

**响应 `200`：**

```json
{
  "status": "ok",
  "active": 0
}
```

`active` 为当前正在处理的 AI 请求数。

---

## 静态资源

### GET `/uploads/*`

封面图片等静态文件通过此路径直接访问，无需认证。

---

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `users` | 用户 |
| `books` | 书籍（含 `content_hash` 用于去重） |
| `chapters` | 章节 |
| `categories` | 分类（树形，支持 `parent_id`） |
| `tags` | 标签 |
| `book_categories` | 书籍-分类关联（多对多） |
| `book_tags` | 书籍-标签关联（多对多） |
| `user_books` | 用户-书籍关联（书架 + 阅读进度 + locator + 版本号） |
| `bookmarks` | 书签 |
| `highlights` | 高亮 |
| `tts_progress` | TTS 朗读位置（每本书独立） |
| `reading_sessions` | 阅读统计会话（客户端 UUID 主键） |
| `deleted_books` | 删除墓碑（同步用，区分 shelf/file 删除类型） |
| `user_settings` | 用户阅读设置（键值对存储） |
