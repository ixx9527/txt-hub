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

// GET progress — returns full locator + version for sync
router.get('/:bookId/progress', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT progress, locator, current_cfi, status, version, updated_at, last_chapter_id
       FROM user_books WHERE user_id = ? AND book_id = ?`,
      [userId, bookId],
    );

    if (!result[0]?.values[0]) {
      res.status(404).json({ error: '未找到阅读进度' });
      return;
    }

    const row = result[0].values[0];
    res.json({
      progress: row[0],
      locator: row[1],
      current_cfi: row[2],
      status: row[3],
      version: row[4],
      updated_at: row[5],
      last_chapter_id: row[6],
    });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: '获取进度失败' });
  }
});

// PUT progress — supports locator, conflict detection via If-Match version
router.put('/:bookId/progress', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;
    const { progress, current_cfi, locator, status, last_chapter_id } = req.body as {
      progress?: number;
      current_cfi?: string;
      locator?: string;
      status?: string;
      last_chapter_id?: string;
    };

    // Conflict detection via If-Match header
    const ifMatch = req.headers['if-match'];
    if (ifMatch !== undefined) {
      const expectedVersion = parseInt(ifMatch.replace(/"/g, ''));
      const current = db.exec(
        `SELECT version FROM user_books WHERE user_id = ? AND book_id = ?`,
        [userId, bookId],
      );
      const serverVersion = current[0]?.values[0]?.[0] as number | undefined;

      if (serverVersion === undefined) {
        // No existing record — conflict if client expected a version
        res.status(409).json({ error: '进度不存在', server_version: null });
        return;
      }
      if (serverVersion !== expectedVersion) {
        res.status(409).json({
          error: '版本冲突',
          server_version: serverVersion,
        });
        return;
      }
    }

    db.run(
      `INSERT INTO user_books (user_id, book_id, progress, status, last_chapter_id, locator, last_read_at, updated_at)
       VALUES (?, ?, COALESCE(?, 0), COALESCE(?, 'want'), ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(user_id, book_id) DO UPDATE SET
         progress = COALESCE(excluded.progress, user_books.progress),
         current_cfi = COALESCE(?, user_books.current_cfi),
         locator = COALESCE(?, user_books.locator),
         status = COALESCE(excluded.status, user_books.status),
         last_chapter_id = COALESCE(excluded.last_chapter_id, user_books.last_chapter_id),
         last_read_at = datetime('now'),
         updated_at = datetime('now'),
         version = user_books.version + 1`,
      [
        userId, bookId, progress ?? null, status ?? null,
        last_chapter_id ?? null, locator ?? null,
        current_cfi ?? null, locator ?? null,
      ],
    );
    save();

    // Return new version + updated_at
    const updated = db.exec(
      `SELECT version, updated_at FROM user_books WHERE user_id = ? AND book_id = ?`,
      [userId, bookId],
    );
    const newVersion = updated[0]?.values[0]?.[0] as number;
    const updatedAt = updated[0]?.values[0]?.[1] as string;

    res.json({ success: true, version: newVersion, updated_at: updatedAt });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(500).json({ error: '更新进度失败' });
  }
});

// GET TTS progress
router.get('/:bookId/tts-progress', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT locator, updated_at FROM tts_progress WHERE user_id = ? AND book_id = ?`,
      [userId, bookId],
    );

    if (!result[0]?.values[0]) {
      res.status(404).json({ error: '未找到 TTS 进度' });
      return;
    }

    const row = result[0].values[0];
    res.json({ locator: row[0], updated_at: row[1] });
  } catch (err) {
    console.error('Get TTS progress error:', err);
    res.status(500).json({ error: '获取 TTS 进度失败' });
  }
});

// PUT TTS progress
router.put('/:bookId/tts-progress', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;
    const { locator } = req.body as { locator?: string };

    if (!locator) {
      res.status(400).json({ error: '缺少 locator' });
      return;
    }

    db.run(
      `INSERT INTO tts_progress (user_id, book_id, locator, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, book_id) DO UPDATE SET
         locator = excluded.locator,
         updated_at = datetime('now')`,
      [userId, bookId, locator],
    );
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Update TTS progress error:', err);
    res.status(500).json({ error: '更新 TTS 进度失败' });
  }
});

// DELETE shelf — soft delete with tombstone
router.delete('/:bookId', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const bookId = parseInt(req.params.bookId);
    const userId = req.user!.userId;

    // Record tombstone for sync
    db.run(
      `INSERT INTO deleted_books (user_id, book_id, delete_type) VALUES (?, ?, 'shelf')`,
      [userId, bookId],
    );

    // Remove user_books record (progress, etc.)
    db.run(`DELETE FROM user_books WHERE user_id = ? AND book_id = ?`, [userId, bookId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove from shelf error:', err);
    res.status(500).json({ error: '移出书架失败' });
  }
});

export default router;
