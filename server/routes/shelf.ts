import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;
    const status = req.query.status as string;

    let where = 'ub.user_id = ?';
    const params: (string | number)[] = [userId];

    if (status && ['reading', 'finished', 'want'].includes(status)) {
      where += ' AND ub.status = ?';
      params.push(status);
    }

    const result = db.exec(
      `SELECT b.id, b.title, b.author, b.cover_path, b.file_format,
              ub.status, ub.progress, ub.last_read_at, ub.created_at
       FROM user_books ub
       JOIN books b ON ub.book_id = b.id
       WHERE ${where}
       ORDER BY ub.last_read_at DESC, ub.created_at DESC`,
      params,
    );

    const books = (result[0]?.values || []).map((row) => ({
      id: row[0], title: row[1], author: row[2], cover_path: row[3],
      file_format: row[4], status: row[5], progress: row[6],
      last_read_at: row[7], added_at: row[8],
    }));

    res.json({ books });
  } catch (err) {
    console.error('Shelf list error:', err);
    res.status(500).json({ error: '获取书架失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const { book_id } = req.body as { book_id?: number };
    if (!book_id) {
      res.status(400).json({ error: '缺少 book_id' });
      return;
    }

    const userId = req.user!.userId;

    const existing = db.exec(
      `SELECT user_id FROM user_books WHERE user_id = ? AND book_id = ?`,
      [userId, book_id],
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      res.status(409).json({ error: '已在书架中' });
      return;
    }

    db.run(
      `INSERT INTO user_books (user_id, book_id, status) VALUES (?, ?, 'want')`,
      [userId, book_id],
    );
    save();

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add to shelf error:', err);
    res.status(500).json({ error: '加入书架失败' });
  }
});

router.delete('/:bookId', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    db.run(`DELETE FROM user_books WHERE user_id = ? AND book_id = ?`, [userId, bookId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove from shelf error:', err);
    res.status(500).json({ error: '移出书架失败' });
  }
});

router.put('/:bookId/progress', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;
    const { progress, current_cfi, status, last_chapter_id } = req.body as {
      progress?: number;
      current_cfi?: string;
      status?: string;
      last_chapter_id?: string;
    };

    db.run(
      `INSERT INTO user_books (user_id, book_id, progress, status, last_chapter_id, last_read_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, book_id) DO UPDATE SET
         progress = COALESCE(excluded.progress, user_books.progress),
         current_cfi = COALESCE(?, user_books.current_cfi),
         status = COALESCE(excluded.status, user_books.status),
         last_chapter_id = COALESCE(excluded.last_chapter_id, user_books.last_chapter_id),
         last_read_at = datetime('now')`,
      [userId, bookId, progress ?? null, status ?? null, last_chapter_id ?? null, current_cfi ?? null],
    );
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: '更新进度失败' });
  }
});

export default router;
