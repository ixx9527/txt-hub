import sharp from 'sharp';

interface CoverTheme {
  id: string;
  stops: [number, string][];
  accent: string;
  grain: number;
  pattern?: 'lines' | 'dots' | 'circles' | 'none';
  borderAlpha: number;
}

const THEMES: CoverTheme[] = [
  {
    id: 'midnight', stops: [[0, '#1e3a5f'], [0.5, '#162d4a'], [1, '#0a1628']],
    accent: 'rgba(180, 200, 240, 0.5)', grain: 0.03, pattern: 'lines', borderAlpha: 0.15,
  },
  {
    id: 'ember', stops: [[0, '#3d1c00'], [0.4, '#2a1200'], [1, '#0d0800']],
    accent: 'rgba(255, 170, 60, 0.5)', grain: 0.04, pattern: 'dots', borderAlpha: 0.12,
  },
  {
    id: 'forest', stops: [[0, '#0d3320'], [0.5, '#0a2818'], [1, '#051a0f']],
    accent: 'rgba(120, 200, 160, 0.45)', grain: 0.03, pattern: 'lines', borderAlpha: 0.12,
  },
  {
    id: 'wine', stops: [[0, '#3a1025'], [0.5, '#2a0a1a'], [1, '#150510']],
    accent: 'rgba(220, 120, 170, 0.4)', grain: 0.04, pattern: 'circles', borderAlpha: 0.12,
  },
  {
    id: 'slate', stops: [[0, '#3a4550'], [0.5, '#2c3540'], [1, '#1a222c']],
    accent: 'rgba(200, 210, 220, 0.4)', grain: 0.05, pattern: 'lines', borderAlpha: 0.1,
  },
  {
    id: 'dusk', stops: [[0, '#2d1b4e'], [0.4, '#1f1340'], [1, '#0e0a20']],
    accent: 'rgba(190, 160, 255, 0.45)', grain: 0.03, pattern: 'dots', borderAlpha: 0.12,
  },
  {
    id: 'ocean', stops: [[0, '#0a3040'], [0.5, '#082838'], [1, '#041820']],
    accent: 'rgba(100, 200, 220, 0.45)', grain: 0.03, pattern: 'circles', borderAlpha: 0.12,
  },
  {
    id: 'charcoal', stops: [[0, '#3a3a3a'], [0.5, '#282828'], [1, '#141414']],
    accent: 'rgba(220, 220, 220, 0.35)', grain: 0.06, pattern: 'none', borderAlpha: 0.1,
  },
  {
    id: 'autumn', stops: [[0, '#4a2800'], [0.4, '#3a1e00'], [1, '#1a0e00']],
    accent: 'rgba(255, 200, 80, 0.45)', grain: 0.04, pattern: 'circles', borderAlpha: 0.12,
  },
  {
    id: 'jade', stops: [[0, '#0a3a3a'], [0.5, '#083030'], [1, '#041c1c']],
    accent: 'rgba(100, 230, 200, 0.45)', grain: 0.03, pattern: 'dots', borderAlpha: 0.12,
  },
];

const W = 600;
const H = 800;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function randomTheme(): CoverTheme {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

function wrapTitle(text: string, fontSize: number, maxLineWidth: number): string[] {
  const charWidth = fontSize;
  const charsPerLine = Math.floor(maxLineWidth / charWidth);
  if (charsPerLine <= 0) return [text];
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += charsPerLine) {
    lines.push(text.slice(i, i + charsPerLine));
  }
  return lines;
}

function buildPatternSvg(theme: CoverTheme): string {
  const accentFaint = theme.accent.replace(/[\d.]+\)$/, '0.06)');
  const accentDots = theme.accent.replace(/[\d.]+\)$/, '0.08)');
  const accentCircles = theme.accent.replace(/[\d.]+\)$/, '0.04)');

  if (theme.pattern === 'lines') {
    let lines = '';
    for (let y = 0; y < H; y += 40) {
      lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${accentFaint}" stroke-width="0.5"/>`;
    }
    return lines;
  }
  if (theme.pattern === 'dots') {
    let dots = '';
    for (let x = 20; x < W; x += 30) {
      for (let y = 20; y < H; y += 30) {
        dots += `<circle cx="${x}" cy="${y}" r="1" fill="${accentDots}"/>`;
      }
    }
    return dots;
  }
  if (theme.pattern === 'circles') {
    let circles = '';
    for (let r = 100; r < 600; r += 80) {
      circles += `<circle cx="${W / 2}" cy="${H / 2}" r="${r}" fill="none" stroke="${accentCircles}" stroke-width="0.5"/>`;
    }
    return circles;
  }
  return '';
}

function buildCoverSvg(title: string, author: string, theme: CoverTheme): string {
  const gradId = 'grad';
  const gradientStops = theme.stops
    .map(([offset, color]) => `<stop offset="${offset * 100}%" stop-color="${color}"/>`)
    .join('');

  const titleFontSize = title.length <= 6 ? 56 : title.length <= 12 ? 44 : 36;
  const maxLineWidth = W - 120;
  const titleLines = wrapTitle(title, titleFontSize, maxLineWidth);
  const lineHeight = titleFontSize * 1.5;
  const totalTitleHeight = titleLines.length * lineHeight;
  const titleStartY = H * 0.38 - totalTitleHeight / 2 + titleFontSize * 0.35;

  const titleTextElements = titleLines
    .map((line, i) => {
      const y = titleStartY + i * lineHeight;
      return `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="#ffffff"
        font-family="Noto Serif SC, Source Han Serif CN, SimSun, serif"
        font-size="${titleFontSize}" font-weight="bold">${escapeXml(line)}</text>`;
    })
    .join('');

  const dividerY = titleStartY + totalTitleHeight + 30;
  const authorY = dividerY + 50;

  const patternSvg = buildPatternSvg(theme);

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0.3" y2="1">
        ${gradientStops}
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#${gradId})"/>
    ${patternSvg}
    <rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none"
      stroke="rgba(255,255,255,${theme.borderAlpha})" stroke-width="1"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none"
      stroke="rgba(255,255,255,${theme.borderAlpha})" stroke-width="1"/>
    ${titleTextElements}
    <line x1="${W / 2 - 60}" y1="${dividerY}" x2="${W / 2 + 60}" y2="${dividerY}"
      stroke="${theme.accent}" stroke-width="1"/>
    <text x="${W / 2}" y="${authorY}" text-anchor="middle" fill="rgba(255,255,255,0.75)"
      font-family="Noto Sans SC, Microsoft YaHei, sans-serif" font-size="24">${escapeXml(author)}</text>
  </svg>`;
}

export async function generateThemedCover(
  title: string,
  author: string,
  themeId?: string,
): Promise<Buffer> {
  const theme = themeId
    ? THEMES.find((t) => t.id === themeId) ?? randomTheme()
    : randomTheme();

  const svg = buildCoverSvg(title, author, theme);
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

export async function generateAICover(
  title: string,
  author: string,
  style?: string,
): Promise<Buffer> {
  const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN;
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
  if (!AI_SERVICE_TOKEN || !AI_SERVICE_URL) {
    throw new Error('AI 服务未配置');
  }

  const safeTitle = title.replace(/[{}<>\\]/g, '').trim();
  const safeAuthor = author.replace(/[{}<>\\]/g, '').trim();
  const styleHint = style ? `，${style.replace(/[{}<>\\]/g, '').trim()}` : '';
  const prompt = `为一本名为《${safeTitle}》的书设计封面，作者：${safeAuthor}${styleHint}。要求：专业书籍封面设计，竖版构图，画面精美有艺术感，书名文字清晰醒目地展示在封面上，整体风格协调统一，高质量印刷品质。`;

  const body = {
    model: 'qwen-image-2.0-pro',
    input: {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
    },
    parameters: {
      size: '768*1024',
      n: 1,
      prompt_extend: true,
      watermark: false,
      negative_prompt: '低分辨率，低画质，模糊，变形，扭曲，文字错误，文字模糊，构图混乱，过度饱和，蜡像感',
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

  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error('图片下载失败');
  const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

  return sharp(imgBuffer).resize(600, 800, { fit: 'cover' }).jpeg({ quality: 90 }).toBuffer();
}

export { THEMES };
