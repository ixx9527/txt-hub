import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb, save } from '../db.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
      return;
    }
    if (username.length < 2 || username.length > 30) {
      res.status(400).json({ error: '用户名长度 2-30 个字符' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: '密码长度 6-128 个字符' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' });
      return;
    }

    const db = await getDb();

    const existing = db.exec(
      `SELECT id FROM users WHERE username = ? OR email = ?`,
      [username, email],
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      res.status(409).json({ error: '用户名或邮箱已被注册' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
      [username, email, passwordHash],
    );
    save();

    const result = db.exec(`SELECT id, role FROM users WHERE username = ?`, [username]);
    const user = result[0]?.values[0];
    if (!user) {
      res.status(500).json({ error: '注册失败' });
      return;
    }

    const token = signToken({
      userId: user[0] as number,
      username,
      role: user[1] as string,
    });

    res.status(201).json({
      token,
      user: { id: user[0], username, email, role: user[1] },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body as { login?: string; password?: string };

    if (!login || !password) {
      res.status(400).json({ error: '请输入用户名/邮箱和密码' });
      return;
    }

    const db = await getDb();
    const result = db.exec(
      `SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ?`,
      [login, login],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const [id, username, email, passwordHash, role] = result[0].values[0];
    const valid = await bcrypt.compare(password, passwordHash as string);
    if (!valid) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    const token = signToken({
      userId: id as number,
      username: username as string,
      role: role as string,
    });

    res.json({
      token,
      user: { id, username, email, role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT id, username, email, role, created_at FROM users WHERE id = ?`,
      [req.user!.userId],
    );

    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const [id, username, email, role, createdAt] = result[0].values[0];
    res.json({ id, username, email, role, created_at: createdAt });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
