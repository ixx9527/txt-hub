import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const result = db.exec(
      `SELECT t.id, t.name, COUNT(bt.book_id) as book_count
       FROM tags t LEFT JOIN book_tags bt ON t.id = bt.tag_id
       GROUP BY t.id ORDER BY book_count DESC, t.name`
    );

    const tags = (result[0]?.values || []).map((row) => ({
      id: row[0], name: row[1], book_count: row[2],
    }));

    res.json({ tags });
  } catch (err) {
    console.error('List tags error:', err);
    res.status(500).json({ error: '获取标签失败' });
  }
});

router.post('/', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const { name } = req.body as { name?: string };

    if (!name || name.length < 1 || name.length > 30) {
      res.status(400).json({ error: '标签名 1-30 个字符' });
      return;
    }

    const existing = db.exec(`SELECT id FROM tags WHERE name = ?`, [name]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      res.json({ id: existing[0].values[0][0], name });
      return;
    }

    db.run(`INSERT INTO tags (name) VALUES (?)`, [name]);
    save();

    const idResult = db.exec(`SELECT last_insert_rowid()`);
    res.status(201).json({ id: idResult[0].values[0][0], name });
  } catch (err) {
    console.error('Create tag error:', err);
    res.status(500).json({ error: '创建标签失败' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);

    db.run(`DELETE FROM book_tags WHERE tag_id = ?`, [id]);
    db.run(`DELETE FROM tags WHERE id = ?`, [id]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete tag error:', err);
    res.status(500).json({ error: '删除标签失败' });
  }
});

// Tag a book
router.post('/:id/books', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const tagId = parseInt(req.params.id);
    const { book_id } = req.body as { book_id?: number };
    if (!book_id) {
      res.status(400).json({ error: '缺少 book_id' });
      return;
    }

    db.run(`INSERT OR IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)`, [book_id, tagId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Tag book error:', err);
    res.status(500).json({ error: '添加标签失败' });
  }
});

router.delete('/:id/books/:bookId', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const tagId = parseInt(req.params.id);
    const bookId = parseInt(req.params.bookId);

    db.run(`DELETE FROM book_tags WHERE tag_id = ? AND book_id = ?`, [tagId, bookId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Untag book error:', err);
    res.status(500).json({ error: '移除标签失败' });
  }
});

export default router;
