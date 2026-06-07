const WIDTH = 600;
const HEIGHT = 800;

export interface CoverTheme {
  id: string;
  name: string;
  /** Multi-stop gradient colors: [[offset, color], ...] */
  stops: [number, string][];
  /** Accent color for border/line decorations */
  accent: string;
  /** Noise/grain intensity 0–1 */
  grain: number;
  /** Decorative pattern overlay */
  pattern?: 'lines' | 'dots' | 'circles' | 'none';
  /** Inner border color */
  borderAlpha: number;
}

export const THEMES: CoverTheme[] = [
  {
    id: 'midnight',
    name: '暗夜',
    stops: [
      [0, '#1e3a5f'],
      [0.5, '#162d4a'],
      [1, '#0a1628'],
    ],
    accent: 'rgba(180, 200, 240, 0.5)',
    grain: 0.03,
    pattern: 'lines',
    borderAlpha: 0.15,
  },
  {
    id: 'ember',
    name: '余烬',
    stops: [
      [0, '#3d1c00'],
      [0.4, '#2a1200'],
      [1, '#0d0800'],
    ],
    accent: 'rgba(255, 170, 60, 0.5)',
    grain: 0.04,
    pattern: 'dots',
    borderAlpha: 0.12,
  },
  {
    id: 'forest',
    name: '深林',
    stops: [
      [0, '#0d3320'],
      [0.5, '#0a2818'],
      [1, '#051a0f'],
    ],
    accent: 'rgba(120, 200, 160, 0.45)',
    grain: 0.03,
    pattern: 'lines',
    borderAlpha: 0.12,
  },
  {
    id: 'wine',
    name: '红酒',
    stops: [
      [0, '#3a1025'],
      [0.5, '#2a0a1a'],
      [1, '#150510'],
    ],
    accent: 'rgba(220, 120, 170, 0.4)',
    grain: 0.04,
    pattern: 'circles',
    borderAlpha: 0.12,
  },
  {
    id: 'slate',
    name: '青石',
    stops: [
      [0, '#3a4550'],
      [0.5, '#2c3540'],
      [1, '#1a222c'],
    ],
    accent: 'rgba(200, 210, 220, 0.4)',
    grain: 0.05,
    pattern: 'lines',
    borderAlpha: 0.1,
  },
  {
    id: 'dusk',
    name: '暮色',
    stops: [
      [0, '#2d1b4e'],
      [0.4, '#1f1340'],
      [1, '#0e0a20'],
    ],
    accent: 'rgba(190, 160, 255, 0.45)',
    grain: 0.03,
    pattern: 'dots',
    borderAlpha: 0.12,
  },
  {
    id: 'ocean',
    name: '深海',
    stops: [
      [0, '#0a3040'],
      [0.5, '#082838'],
      [1, '#041820'],
    ],
    accent: 'rgba(100, 200, 220, 0.45)',
    grain: 0.03,
    pattern: 'circles',
    borderAlpha: 0.12,
  },
  {
    id: 'charcoal',
    name: '墨炭',
    stops: [
      [0, '#3a3a3a'],
      [0.5, '#282828'],
      [1, '#141414'],
    ],
    accent: 'rgba(220, 220, 220, 0.35)',
    grain: 0.06,
    pattern: 'none',
    borderAlpha: 0.1,
  },
  {
    id: 'autumn',
    name: '秋叶',
    stops: [
      [0, '#4a2800'],
      [0.4, '#3a1e00'],
      [1, '#1a0e00'],
    ],
    accent: 'rgba(255, 200, 80, 0.45)',
    grain: 0.04,
    pattern: 'circles',
    borderAlpha: 0.12,
  },
  {
    id: 'jade',
    name: '碧玉',
    stops: [
      [0, '#0a3a3a'],
      [0.5, '#083030'],
      [1, '#041c1c'],
    ],
    accent: 'rgba(100, 230, 200, 0.45)',
    grain: 0.03,
    pattern: 'dots',
    borderAlpha: 0.12,
  },
];

function randomTheme(): CoverTheme {
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}

export function generateCover(
  title: string,
  author: string,
  theme?: CoverTheme,
): Promise<Blob> {
  const t = theme ?? randomTheme();

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  // --- textured gradient background ---
  const gradient = ctx.createLinearGradient(0, 0, WIDTH * 0.3, HEIGHT);
  for (const [offset, color] of t.stops) {
    gradient.addColorStop(offset, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // --- subtle noise/grain overlay ---
  if (t.grain > 0) {
    const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 255 * t.grain;
      d[i] = Math.max(0, Math.min(255, d[i] + noise));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // --- decorative pattern overlay ---
  ctx.strokeStyle = t.accent.replace(/[\d.]+\)$/, '0.06)');
  ctx.lineWidth = 0.5;

  if (t.pattern === 'lines') {
    for (let y = 0; y < HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + Math.random() * 4);
      ctx.lineTo(WIDTH, y + Math.random() * 4);
      ctx.stroke();
    }
  } else if (t.pattern === 'dots') {
    ctx.fillStyle = t.accent.replace(/[\d.]+\)$/, '0.08)');
    for (let x = 20; x < WIDTH; x += 30) {
      for (let y = 20; y < HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.arc(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (t.pattern === 'circles') {
    ctx.strokeStyle = t.accent.replace(/[\d.]+\)$/, '0.04)');
    for (let r = 100; r < 600; r += 80) {
      ctx.beginPath();
      ctx.arc(
        WIDTH / 2 + (Math.random() - 0.5) * 40,
        HEIGHT / 2 + (Math.random() - 0.5) * 40,
        r,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
  }

  // --- inner border ---
  ctx.strokeStyle = `rgba(255, 255, 255, ${t.borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, WIDTH - 60, HEIGHT - 60);
  ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

  // --- title ---
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const titleFontSize = title.length <= 6 ? 56 : title.length <= 12 ? 44 : 36;
  ctx.font = `bold ${titleFontSize}px "Noto Serif SC", "Source Han Serif CN", "SimSun", serif`;

  const maxWidth = WIDTH - 120;
  const titleLines = wrapText(ctx, title, maxWidth);
  const lineHeight = titleFontSize * 1.5;
  const titleStartY = HEIGHT * 0.38 - ((titleLines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < titleLines.length; i++) {
    ctx.fillText(titleLines[i], WIDTH / 2, titleStartY + i * lineHeight);
  }

  // --- divider ---
  const dividerY = titleStartY + titleLines.length * lineHeight + 30;
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 60, dividerY);
  ctx.lineTo(WIDTH / 2 + 60, dividerY);
  ctx.stroke();

  // --- author ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `24px "Noto Sans SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText(author, WIDTH / 2, dividerY + 50);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      'image/jpeg',
      0.9,
    );
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = '';

  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
