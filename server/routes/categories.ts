import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const result = db.exec(
      `SELECT id, name, parent_id, sort_order FROM categories ORDER BY sort_order, name`
    );

    const categories = (result[0]?.values || []).map((row) => ({
      id: row[0], name: row[1], parent_id: row[2], sort_order: row[3],
    }));

    // Build tree
    const map = new Map<number, { id: number; name: string; parent_id: number | null; children: any[] }>();
    const roots: any[] = [];

    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of categories) {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ categories: roots });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: '获取分类失败' });
  }
});

router.post('/', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const { name, parent_id } = req.body as { name?: string; parent_id?: number };

    if (!name || name.length < 1 || name.length > 50) {
      res.status(400).json({ error: '分类名 1-50 个字符' });
      return;
    }

    db.run(`INSERT INTO categories (name, parent_id) VALUES (?, ?)`, [name, parent_id || null]);
    save();

    res.status(201).json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      res.status(409).json({ error: '分类名已存在' });
      return;
    }
    console.error('Create category error:', err);
    res.status(500).json({ error: '创建分类失败' });
  }
});

router.put('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);
    const { name, parent_id, sort_order } = req.body as { name?: string; parent_id?: number; sort_order?: number };

    db.run(
      `UPDATE categories SET name = COALESCE(?, name), parent_id = COALESCE(?, parent_id),
       sort_order = COALESCE(?, sort_order) WHERE id = ?`,
      [name, parent_id, sort_order, id],
    );
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: '更新分类失败' });
  }
});

router.delete('/:id', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const id = parseInt(req.params.id);

    db.run(`UPDATE categories SET parent_id = NULL WHERE parent_id = ?`, [id]);
    db.run(`DELETE FROM categories WHERE id = ?`, [id]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// Assign category to book
router.post('/:id/books', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const categoryId = parseInt(req.params.id);
    const { book_id } = req.body as { book_id?: number };
    if (!book_id) {
      res.status(400).json({ error: '缺少 book_id' });
      return;
    }

    db.run(`INSERT OR IGNORE INTO book_categories (book_id, category_id) VALUES (?, ?)`, [book_id, categoryId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Assign category error:', err);
    res.status(500).json({ error: '分配分类失败' });
  }
});

router.delete('/:id/books/:bookId', authMiddleware, (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const categoryId = parseInt(req.params.id);
    const bookId = parseInt(req.params.bookId);

    db.run(`DELETE FROM book_categories WHERE book_id = ? AND category_id = ?`, [bookId, categoryId]);
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Remove category error:', err);
    res.status(500).json({ error: '移除分类失败' });
  }
});

export default router;
