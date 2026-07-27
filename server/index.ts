import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = 3847;

const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

if (!AI_SERVICE_TOKEN || !AI_SERVICE_URL) {
  console.error('ERROR: AI_SERVICE_TOKEN and AI_SERVICE_URL must be set');
  process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '1kb' }));

// IP rate limiting: 3 req/min, 15 req/hour
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const hourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: '小时请求次数已达上限，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global concurrency guard
let activeRequests = 0;
const MAX_CONCURRENT = 3;

// --- Routes ---
app.post(
  '/api/generate-cover',
  limiter,
  hourLimiter,
  async (req, res) => {
    if (activeRequests >= MAX_CONCURRENT) {
      res.status(429).json({ error: '服务器繁忙，请稍后再试' });
      return;
    }

    const { title, author, style } = req.body as {
      title?: string;
      author?: string;
      style?: string;
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
  },
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', active: activeRequests });
});

// --- Helpers ---
function buildPrompt(title: string, author: string, style?: string): string {
  const styleHint = style ? `，${style}` : '';
  return `为一本名为《${title}》的书设计封面，作者：${author}${styleHint}。要求：专业书籍封面设计，竖版构图，画面精美有艺术感，书名文字清晰醒目地展示在封面上，整体风格协调统一，高质量印刷品质。`;
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

  const resp = await fetch(AI_SERVICE_URL, {
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
app.listen(PORT, '127.0.0.1', () => {
  console.log(`TXT Hub API server running on http://127.0.0.1:${PORT}`);
});
