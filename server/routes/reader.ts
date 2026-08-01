import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Bookmarks
router.get('/:bookId/bookmarks', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT id, chapter_id, cfi, note, created_at FROM bookmarks
       WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC`,
      [userId, bookId],
    );

    const bookmarks = (result[0]?.values || []).map((row) => ({
      id: row[0], chapter_id: row[1], cfi: row[2], note: row[3], created_at: row[4],
    }));

    res.json({ bookmarks });
  } catch (err) {
    res.status(500).json({ error: '获取书签失败' });
  }
});

router.post('/:bookId/bookmarks', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;
    const { chapter_id, cfi, note } = req.body as { chapter_id?: string; cfi?: string; note?: string };

    db.run(
      `INSERT INTO bookmarks (user_id, book_id, chapter_id, cfi, note) VALUES (?, ?, ?, ?, ?)`,
      [userId, bookId, chapter_id || null, cfi || null, note || null],
    );
    save();

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '创建书签失败' });
  }
});

router.delete('/:bookId/bookmarks/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;

    db.run(`DELETE FROM bookmarks WHERE id = ? AND user_id = ?`, [id, userId]);
    save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除书签失败' });
  }
});

// Highlights
router.get('/:bookId/highlights', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT id, chapter_id, cfi, text, color, note, created_at FROM highlights
       WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC`,
      [userId, bookId],
    );

    const highlights = (result[0]?.values || []).map((row) => ({
      id: row[0], chapter_id: row[1], cfi: row[2], text: row[3],
      color: row[4], note: row[5], created_at: row[6],
    }));

    res.json({ highlights });
  } catch (err) {
    res.status(500).json({ error: '获取高亮失败' });
  }
});

router.post('/:bookId/highlights', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;
    const { chapter_id, cfi, text, color, note } = req.body as {
      chapter_id?: string; cfi?: string; text?: string; color?: string; note?: string;
    };

    db.run(
      `INSERT INTO highlights (user_id, book_id, chapter_id, cfi, text, color, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, bookId, chapter_id || null, cfi || null, text || null, color || 'yellow', note || null],
    );
    save();

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '创建高亮失败' });
  }
});

router.delete('/:bookId/highlights/:id', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const userId = req.user!.userId;

    db.run(`DELETE FROM highlights WHERE id = ? AND user_id = ?`, [id, userId]);
    save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除高亮失败' });
  }
});

// Chapter content for reader
router.get('/:bookId/chapters/:chapterId', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const chapterId = req.params.chapterId;

    const result = db.exec(
      `SELECT chapter_id, title, content FROM chapters WHERE book_id = ? AND chapter_id = ?`,
      [bookId, chapterId],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ error: '章节不存在' });
      return;
    }

    const row = result[0].values[0];
    res.json({ id: row[0], title: row[1], content: row[2] });
  } catch (err) {
    res.status(500).json({ error: '获取章节失败' });
  }
});

// Book internal search
router.get('/:bookId/search', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const q = req.query.q as string;

    if (!q || q.length < 1) {
      res.json({ results: [] });
      return;
    }

    const pattern = `%${q}%`;
    const result = db.exec(
      `SELECT chapter_id, title,
              SUBSTR(content, MAX(1, INSTR(LOWER(content), LOWER(?)) - 40), 120) as snippet
       FROM chapters
       WHERE book_id = ? AND (title LIKE ? OR content LIKE ?)
       LIMIT 50`,
      [q, bookId, pattern, pattern],
    );

    const results = (result[0]?.values || []).map((row) => ({
      chapter_id: row[0], chapter_title: row[1], snippet: row[2],
    }));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: '搜索失败' });
  }
});

export default router;
