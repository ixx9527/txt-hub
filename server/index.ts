import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import shelfRoutes from './routes/shelf.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import readerRoutes from './routes/reader.js';
import syncRoutes from './routes/sync.js';
import readingSessionRoutes from './routes/reading-sessions.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = 3847;

const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

// Ensure directories exist
fs.mkdirSync(path.resolve(process.cwd(), 'uploads'), { recursive: true });
fs.mkdirSync(path.resolve(process.cwd(), 'data'), { recursive: true });

// --- Middleware ---
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://txthub.ixx9527.xin',
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for AI endpoints
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
const aiHourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: '小时请求次数已达上限，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

let activeRequests = 0;
const MAX_CONCURRENT = 3;

// --- API Routes ---
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/shelf', shelfRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/reader', readerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/reading-sessions', readingSessionRoutes);
app.use('/api/user', settingsRoutes);

// AI cover generation (existing)
app.post('/api/generate-cover', aiLimiter, aiHourLimiter, async (req, res) => {
  if (!AI_SERVICE_TOKEN || !AI_SERVICE_URL) {
    res.status(503).json({ error: 'AI 服务未配置' });
    return;
  }
  if (activeRequests >= MAX_CONCURRENT) {
    res.status(429).json({ error: '服务器繁忙，请稍后再试' });
    return;
  }

  const { title, author, style } = req.body as {
    title?: string; author?: string; style?: string;
  };

  if (!title || typeof title !== 'string' || title.length > 100) {
    res.status(400).json({ error: '书名不能为空且不超过100字' });
    return;
  }
  if (author && typeof author === 'string' && author.length > 100) {
    res.status(400).json({ error: '作者名不超过100字' });
    return;
  }
  if (style && typeof style === 'string' && style.length > 500) {
    res.status(400).json({ error: '风格描述不超过500字' });
    return;
  }

  const prompt = buildPrompt(title, author || '佚名', style);

  activeRequests++;
  try {
    const imageUrl = await callDashScope(prompt);
    const base64 = await downloadImage(imageUrl);
    res.json({ image: base64, mimeType: 'image/png' });
  } catch (err) {
    console.error('Generate cover error:', err);
    const message = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ error: message });
  } finally {
    activeRequests--;
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', active: activeRequests });
});

// --- Helpers ---
function sanitizeInput(s: string): string {
  return s.replace(/[{}<>\\]/g, '').trim();
}

function buildPrompt(title: string, author: string, style?: string): string {
  const safeTitle = sanitizeInput(title);
  const safeAuthor = sanitizeInput(author);
  const styleHint = style ? `，${sanitizeInput(style)}` : '';
  return `为一本名为《${safeTitle}》的书设计封面，作者：${safeAuthor}${styleHint}。要求：专业书籍封面设计，竖版构图，画面精美有艺术感，书名文字清晰醒目地展示在封面上，整体风格协调统一，高质量印刷品质。`;
}

async function callDashScope(prompt: string): Promise<string> {
  const body = {
    model: 'qwen-image-2.0-pro',
    input: {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
    },
    parameters: {
      size: '768*1024',
      n: 1,
      prompt_extend: true,
      watermark: false,
      negative_prompt:
        '低分辨率，低画质，模糊，变形，扭曲，文字错误，文字模糊，构图混乱，过度饱和，蜡像感',
    },
  };

  const resp = await fetch(AI_SERVICE_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_SERVICE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('DashScope error:', resp.status, text);
    throw new Error(`AI 服务返回错误 (${resp.status})`);
  }

  const data = (await resp.json()) as {
    output?: { choices?: Array<{ message?: { content?: Array<{ image?: string }> } }> };
  };
  const imageUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imageUrl) {
    throw new Error('AI 未返回图片');
  }
  return imageUrl;
}

async function downloadImage(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('图片下载失败');
  const buffer = Buffer.from(await resp.arrayBuffer());
  return buffer.toString('base64');
}

// --- Start ---
async function start() {
  await getDb();
  console.log('Database initialized');
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`TXT Hub API server running on http://127.0.0.1:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
