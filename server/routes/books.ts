import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb, getDbSync, save } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { parseEpub } from '../services/epub-parser.js';
import { epubToTxt } from '../services/txt-converter.js';
import { convertTxtToEpub } from '../services/txt-to-epub.js';
import { detectChapterLevel } from '../db.js';

function computeFileHash(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return `sha256:${hash.digest('hex')}`;
}

const router = Router();

router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请选择文件' });
      return;
    }

    // Multer decodes filenames as Latin-1; re-encode to recover UTF-8
    const rawName = Buffer.from(req.file.originalname, 'latin1').toString('utf-8');
    const ext = path.extname(rawName).toLowerCase();
    const format = ext === '.txt' ? 'txt' : 'epub';
    const originalName = path.basename(rawName, ext);

    const meta = await parseEpub(req.file.path, format, originalName);
    const contentHash = computeFileHash(req.file.path);

    const db = await getDb();

    db.run(
      `INSERT INTO books (title, author, publisher, description, language, isbn, cover_path, file_path, file_format, file_size, upload_user_id, content_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        meta.title || originalName,
        meta.author || '佚名',
        meta.publisher || null,
        meta.description || null,
        meta.language || 'zh-CN',
        meta.isbn || null,
        meta.coverPath || null,
        req.file.path,
        format,
        req.file.size,
        req.user!.userId,
        contentHash,
      ],
    );

    const idResult = db.exec('SELECT MAX(id) FROM books');
    const bookId = (idResult[0]?.values[0]?.[0] as number) || 0;
    save();

    // Index chapters for search
    if (meta.chapters && meta.chapters.length > 0) {
      for (let i = 0; i < meta.chapters.length; i++) {
        const ch = meta.chapters[i];
        const level = detectChapterLevel(ch.title);
        db.run(
          `INSERT INTO chapters (book_id, chapter_id, title, content, sort_order, level) VALUES (?, ?, ?, ?, ?, ?)`,
          [bookId, ch.id, ch.title, ch.content, i, level],
        );
      }
      save();
    }

    res.status(201).json({ id: bookId, title: meta.title, format });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: '上传失败' });
  }
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'created_at';
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const search = req.query.q as string;

    let where = 'books.upload_user_id = ?';
    const params: (string | number)[] = [req.user!.userId];

    if (search) {
      where += ` AND (books.title LIKE ? OR books.author LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      where += ` AND books.id IN (SELECT book_id FROM book_categories WHERE category_id = ?)`;
      params.push(parseInt(category));
    }
    if (tag) {
      where += ` AND books.id IN (SELECT book_id FROM book_tags WHERE tag_id = ?)`;
      params.push(parseInt(tag));
    }

    const orderCol = ['created_at', 'title', 'author'].includes(sort) ? sort : 'created_at';
    const orderDir = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const countResult = db.exec(
      `SELECT COUNT(*) FROM books WHERE ${where}`,
      params,
    );
    const total = (countResult[0]?.values[0]?.[0] as number) || 0;

    const result = db.exec(
      `SELECT books.id, books.title, books.author, books.description, books.cover_path,
              books.file_format, books.file_size, books.language, books.created_at,
              GROUP_CONCAT(DISTINCT categories.name) as categories,
              GROUP_CONCAT(DISTINCT tags.name) as tags,
              ub.status as read_status, ub.progress as read_progress, ub.last_read_at
       FROM books
       LEFT JOIN book_categories ON books.id = book_categories.book_id
       LEFT JOIN categories ON book_categories.category_id = categories.id
       LEFT JOIN book_tags ON books.id = book_tags.book_id
       LEFT JOIN tags ON book_tags.tag_id = tags.id
       LEFT JOIN user_books ub ON ub.book_id = books.id AND ub.user_id = ?
       WHERE ${where}
       GROUP BY books.id
       ORDER BY books.${orderCol} ${orderDir}
       LIMIT ? OFFSET ?`,
      [...params, req.user!.userId, limit, offset],
    );

    const books = (result[0]?.values || []).map((row) => ({
      id: row[0],
      title: row[1],
      author: row[2],
      description: row[3],
      has_cover: !!row[4],
      file_format: row[5],
      file_size: row[6],
      language: row[7],
      created_at: row[8],
      categories: row[9] ? (row[9] as string).split(',') : [],
      tags: row[10] ? (row[10] as string).split(',') : [],
      read_status: row[11] || null,
      read_progress: row[12] || 0,
      last_read_at: row[13] || null,
    }));

    res.json({ books, total, page, limit });
  } catch (err) {
    console.error('List books error:', err);
    res.status(500).json({ error: '获取书籍列表失败' });
  }
});

router.get('/search', authMiddleware, (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 1) {
      res.json({ results: [] });
      return;
    }

    const db = getDbSync();
    const pattern = `%${q}%`;
    const result = db.exec(
      `SELECT book_id, chapter_id, title,
              SUBSTR(content, MAX(1, INSTR(LOWER(content), LOWER(?)) - 40), 120) as snippet
       FROM chapters
       WHERE book_id IN (SELECT id FROM books WHERE upload_user_id = ?)
         AND (title LIKE ? OR content LIKE ?)
       LIMIT 50`,
      [q, req.user!.userId, pattern, pattern],
    );

    const results = (result[0]?.values || []).map((row) => ({
      book_id: row[0],
      chapter_id: row[1],
      chapter_title: row[2],
      snippet: row[3],
    }));

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: '搜索失败' });
  }
});

// Lookup book by content hash (for deduplication)
router.get('/by-hash/:sha256', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const sha256 = req.params.sha256;
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT id, title, author, file_format, file_size, content_hash, created_at
       FROM books WHERE content_hash = ? AND upload_user_id = ?`,
      [sha256, userId],
    );

    if (!result[0]?.values[0]) {
      res.status(404).json({ error: '未找到匹配书籍' });
      return;
    }

    const row = result[0].values[0];
    res.json({
      id: row[0],
      title: row[1],
      author: row[2],
      file_format: row[3],
      file_size: row[4],
      content_hash: row[5],
      created_at: row[6],
    });
  } catch (err) {
    console.error('Lookup by hash error:', err);
    res.status(500).json({ error: '查找失败' });
  }
});

router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);

    const isAdmin = req.user!.role === 'admin';
    const bookResult = db.exec(
      `SELECT id, title, author, publisher, description, language, isbn, cover_path,
              file_path, file_format, file_size, upload_user_id, created_at, updated_at
       FROM books WHERE id = ?${isAdmin ? '' : ' AND upload_user_id = ?'}`,
      isAdmin ? [id] : [id, req.user!.userId],
    );

    if (bookResult.length === 0 || bookResult[0].values.length === 0) {
      res.status(404).json({ error: '书籍不存在' });
      return;
    }

    const row = bookResult[0].values[0];
    const ownerId = row[11] as number;
    const book = {
      id: row[0], title: row[1], author: row[2], publisher: row[3],
      description: row[4], language: row[5], isbn: row[6],
      file_format: row[9], file_size: row[10],
      created_at: row[12], updated_at: row[13],
      can_edit: req.user!.userId === ownerId || isAdmin,
    };

    const catResult = db.exec(
      `SELECT c.id, c.name FROM categories c
       JOIN book_categories bc ON bc.category_id = c.id WHERE bc.book_id = ?`,
      [id],
    );
    const categories = (catResult[0]?.values || []).map((r) => ({ id: r[0], name: r[1] }));

    const tagResult = db.exec(
      `SELECT t.id, t.name FROM tags t
       JOIN book_tags bt ON bt.tag_id = t.id WHERE bt.book_id = ?`,
      [id],
    );
    const tags = (tagResult[0]?.values || []).map((r) => ({ id: r[0], name: r[1] }));

    const chapResult = db.exec(
      `SELECT chapter_id, title, sort_order, level FROM chapters WHERE book_id = ? AND chapter_id != 'cover' ORDER BY sort_order`,
      [id],
    );
    const chapters = (chapResult[0]?.values || []).map((r) => ({
      id: r[0], title: r[1], sort_order: r[2], level: r[3] as number,
    }));

    let last_chapter_id: string | null = null;
    if (req.user) {
      const ubResult = db.exec(
        `SELECT last_chapter_id FROM user_books WHERE user_id = ? AND book_id = ?`,
        [req.user.userId, id],
      );
      last_chapter_id = (ubResult[0]?.values[0]?.[0] as string) ?? null;
    }

    res.json({ ...book, categories, tags, chapters, last_chapter_id });
  } catch (err) {
    console.error('Get book error:', err);
    res.status(500).json({ error: '获取书籍详情失败' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const { title, author, publisher, description, language, isbn } = req.body as Record<string, string>;

    const bookResult = db.exec(`SELECT upload_user_id FROM books WHERE id = ?`, [id]);
    if (bookResult.length === 0 || bookResult[0].values.length === 0) {
      res.status(404).json({ error: '书籍不存在' });
      return;
    }

    const ownerId = bookResult[0].values[0][0] as number;
    if (req.user!.userId !== ownerId && req.user!.role !== 'admin') {
      res.status(403).json({ error: '无权修改' });
      return;
    }

    db.run(
      `UPDATE books SET title = COALESCE(?, title), author = COALESCE(?, author),
       publisher = COALESCE(?, publisher), description = COALESCE(?, description),
       language = COALESCE(?, language), isbn = COALESCE(?, isbn),
       updated_at = datetime('now') WHERE id = ?`,
      [title, author, publisher, description, language, isbn, id],
    );
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);

    const bookResult = db.exec(`SELECT upload_user_id, file_path, cover_path FROM books WHERE id = ?`, [id]);
    if (bookResult.length === 0 || bookResult[0].values.length === 0) {
      res.status(404).json({ error: '书籍不存在' });
      return;
    }

    const [ownerId, filePath, coverPath] = bookResult[0].values[0];
    if (req.user!.userId !== (ownerId as number) && req.user!.role !== 'admin') {
      res.status(403).json({ error: '无权删除' });
      return;
    }

    db.run(`DELETE FROM books WHERE id = ?`, [id]);
    save();

    if (filePath && fs.existsSync(filePath as string)) fs.unlinkSync(filePath as string);
    if (coverPath && fs.existsSync(coverPath as string)) fs.unlinkSync(coverPath as string);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

router.get('/:id/download', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const format = (req.query.format as string) || 'epub';

    const result = db.exec(`SELECT title, file_path, file_format FROM books WHERE id = ? AND upload_user_id = ?`, [id, req.user!.userId]);
    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ error: '书籍不存在' });
      return;
    }

    const [title, filePath, fileFormat] = result[0].values[0];

    if (format === fileFormat) {
      const safeName = (title as string).replace(/[^\w\u4e00-\u9fff]/g, '_');
      res.download(filePath as string, `${safeName}.${fileFormat}`);
    } else if (format === 'txt' && fileFormat === 'epub') {
      const txt = epubToTxt(id);
      const safeName = (title as string).replace(/[^\w\u4e00-\u9fff]/g, '_');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.txt"`);
      res.send(txt);
    } else if (format === 'epub' && fileFormat === 'txt') {
      const result = await convertTxtToEpub(filePath as string, title as string);
      const safeName = (title as string).replace(/[^\w\u4e00-\u9fff]/g, '_');
      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.epub"`);
      res.send(Buffer.from(result.epubBuffer));
    } else {
      res.status(400).json({ error: '不支持的转换格式' });
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: '下载失败' });
  }
});

router.get('/:id/cover', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const result = db.exec(`SELECT cover_path FROM books WHERE id = ?`, [id]);
    if (result.length === 0 || result[0].values.length === 0 || !result[0].values[0][0]) {
      res.status(404).json({ error: '封面不存在' });
      return;
    }
    res.sendFile(result[0].values[0][0] as string);
  } catch {
    res.status(500).json({ error: '获取封面失败' });
  }
});

// DELETE cloud file — hard delete book record + file, with tombstone
router.delete('/:id/cloud', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;

    const bookResult = db.exec(
      `SELECT upload_user_id, file_path, cover_path FROM books WHERE id = ?`,
      [id],
    );
    if (!bookResult[0]?.values[0]) {
      res.status(404).json({ error: '书籍不存在' });
      return;
    }

    const ownerId = bookResult[0].values[0][0] as number;
    const filePath = bookResult[0].values[0][1] as string;
    const coverPath = bookResult[0].values[0][2] as string;

    if (userId !== ownerId && req.user!.role !== 'admin') {
      res.status(403).json({ error: '无权删除' });
      return;
    }

    // Record tombstone for sync
    db.run(
      `INSERT INTO deleted_books (user_id, book_id, delete_type) VALUES (?, ?, 'file')`,
      [userId, id],
    );

    // Delete book record (cascades to user_books, chapters, etc.)
    db.run(`DELETE FROM books WHERE id = ?`, [id]);
    save();

    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (coverPath && fs.existsSync(coverPath)) fs.unlinkSync(coverPath);

    res.json({ success: true });
  } catch (err) {
    console.error('Cloud delete error:', err);
    res.status(500).json({ error: '删除云端文件失败' });
  }
});

export default router;
