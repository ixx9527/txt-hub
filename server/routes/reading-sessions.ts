import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// POST /batch — batch upsert reading sessions (idempotent via client UUID)
router.post('/batch', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;
    const { sessions } = req.body as {
      sessions?: Array<{
        id: string;
        book_id: number;
        started_at: string;
        ended_at?: string;
        duration_seconds?: number;
      }>;
    };

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      res.status(400).json({ error: '缺少 sessions 数组' });
      return;
    }

    let inserted = 0;
    let skipped = 0;

    for (const s of sessions) {
      if (!s.id || !s.book_id || !s.started_at) {
        skipped++;
        continue;
      }

      // Check if already exists (idempotent)
      const existing = db.exec(
        `SELECT id FROM reading_sessions WHERE id = ? AND user_id = ?`,
        [s.id, userId],
      );
      if (existing.length > 0 && existing[0].values.length > 0) {
        skipped++;
        continue;
      }

      db.run(
        `INSERT INTO reading_sessions (id, user_id, book_id, started_at, ended_at, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [s.id, userId, s.book_id, s.started_at, s.ended_at ?? null, s.duration_seconds ?? null],
      );
      inserted++;
    }

    save();
    res.json({ success: true, inserted, skipped });
  } catch (err) {
    console.error('Batch reading sessions error:', err);
    res.status(500).json({ error: '批量写入阅读会话失败' });
  }
});

// GET / — incremental pull of reading sessions
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;
    const updatedAfter = req.query.updated_after as string;

    let query: string;
    let params: (string | number)[];

    if (updatedAfter) {
      query = `SELECT id, book_id, started_at, ended_at, duration_seconds, created_at
               FROM reading_sessions
               WHERE user_id = ? AND created_at > ?
               ORDER BY created_at ASC
               LIMIT 500`;
      params = [userId, updatedAfter];
    } else {
      query = `SELECT id, book_id, started_at, ended_at, duration_seconds, created_at
               FROM reading_sessions
               WHERE user_id = ?
               ORDER BY created_at ASC
               LIMIT 500`;
      params = [userId];
    }

    const result = db.exec(query, params);
    const sessions = (result[0]?.values || []).map((row) => ({
      id: row[0],
      book_id: row[1],
      started_at: row[2],
      ended_at: row[3],
      duration_seconds: row[4],
      created_at: row[5],
    }));

    res.json({ sessions });
  } catch (err) {
    console.error('Get reading sessions error:', err);
    res.status(500).json({ error: '获取阅读会话失败' });
  }
});

export default router;
