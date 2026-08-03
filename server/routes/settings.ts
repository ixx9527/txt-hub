import { Router, Request, Response } from 'express';
import { getDbSync, save } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// GET /reader-settings — return all reader settings for the user
router.get('/reader-settings', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;

    const result = db.exec(
      `SELECT setting_key, setting_value, updated_at
       FROM user_settings WHERE user_id = ?`,
      [userId],
    );

    const settings: Record<string, { value: string | null; updated_at: string }> = {};
    for (const row of result[0]?.values || []) {
      settings[row[0] as string] = {
        value: row[1] as string | null,
        updated_at: row[2] as string,
      };
    }

    res.json({ settings });
  } catch (err) {
    console.error('Get reader settings error:', err);
    res.status(500).json({ error: '获取阅读设置失败' });
  }
});

// PUT /reader-settings — batch upsert reader settings
router.put('/reader-settings', (req: Request, res: Response) => {
  try {
    const db = getDbSync();
    const userId = req.user!.userId;
    const { settings } = req.body as {
      settings?: Record<string, string>;
    };

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: '缺少 settings 对象' });
      return;
    }

    for (const [key, value] of Object.entries(settings)) {
      db.run(
        `INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, setting_key) DO UPDATE SET
           setting_value = excluded.setting_value,
           updated_at = datetime('now')`,
        [userId, key, value],
      );
    }
    save();

    res.json({ success: true });
  } catch (err) {
    console.error('Update reader settings error:', err);
    res.status(500).json({ error: '更新阅读设置失败' });
  }
});

export default router;
