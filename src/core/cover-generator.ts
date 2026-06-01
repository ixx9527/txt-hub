const WIDTH = 600;
const HEIGHT = 800;

export function generateCover(title: string, author: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#1e3a5f');
  gradient.addColorStop(1, '#0f1f33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, WIDTH - 60, HEIGHT - 60);
  ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

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

  const dividerY = titleStartY + titleLines.length * lineHeight + 30;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 - 60, dividerY);
  ctx.lineTo(WIDTH / 2 + 60, dividerY);
  ctx.stroke();

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
