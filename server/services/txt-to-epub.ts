import fs from 'fs';
import { parseChapters } from '../../src/core/chapter-parser.js';
import { buildEpub } from '../../src/core/epub-builder.js';
import type { EpubInput } from '../../src/core/epub-builder.js';
import type { BookMeta, Chapter, Volume } from '../../src/types/index.js';
import { generateThemedCover, generateAICover } from './cover-generator.js';

export interface ConvertOptions {
  title?: string;
  author?: string;
  language?: string;
  coverMode?: 'random' | 'ai' | 'none';
  coverTheme?: string;
  aiStyle?: string;
}

export interface ConvertResult {
  epubBuffer: Buffer;
  title: string;
  author: string;
  language: string;
  coverBuffer: Buffer | null;
  chapters: Chapter[];
  volumes: Volume[];
  hasVolumeStructure: boolean;
}

function detectAndDecode(buffer: Buffer): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(buffer);
  } catch { /* fall through */ }

  try {
    const decoder = new TextDecoder('gbk');
    const text = decoder.decode(buffer);
    const cjkRe = /[\u4e00-\u9fff]/;
    const sample = text.slice(0, 2000);
    let cjkCount = 0;
    for (const ch of sample) {
      if (cjkRe.test(ch)) cjkCount++;
    }
    if (cjkCount / sample.length > 0.1) return text;
  } catch { /* fall through */ }

  return buffer.toString('utf-8');
}

function cleanText(text: string): string {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim());
  const merged: string[] = [];
  let prevEmpty = false;
  for (const line of lines) {
    if (line === '') {
      if (!prevEmpty) merged.push('');
      prevEmpty = true;
    } else {
      merged.push(line);
      prevEmpty = false;
    }
  }
  let start = 0;
  while (start < merged.length && merged[start] === '') start++;
  let end = merged.length - 1;
  while (end >= 0 && merged[end] === '') end--;
  return merged.slice(start, end + 1).join('\n');
}

export async function convertTxtToEpub(
  filePath: string,
  originalName: string,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const buffer = fs.readFileSync(filePath);
  const text = cleanText(detectAndDecode(buffer));

  const title = options.title || originalName;
  const author = options.author || '佚名';
  const language = options.language || 'zh-CN';
  const coverMode = options.coverMode || 'random';

  const parseResult = parseChapters(text);

  let coverBuffer: Buffer | null = null;
  if (coverMode === 'ai') {
    try {
      coverBuffer = await generateAICover(title, author, options.aiStyle);
    } catch (err) {
      console.error('AI cover failed, falling back to themed:', err);
      coverBuffer = await generateThemedCover(title, author, options.coverTheme);
    }
  } else if (coverMode === 'random') {
    coverBuffer = await generateThemedCover(title, author, options.coverTheme);
  }

  if (!coverBuffer) {
    coverBuffer = await generateThemedCover(title, author, options.coverTheme);
  }

  const meta: BookMeta = { title, author, language };

  const input: EpubInput = {
    meta,
    volumes: parseResult.volumes,
    chapters: parseResult.chapters,
    hasVolumeStructure: parseResult.hasVolumeStructure,
    coverImage: coverBuffer,
  };

  const epubBuffer = await buildEpub(input, 'nodebuffer');

  return {
    epubBuffer,
    title,
    author,
    language,
    coverBuffer,
    chapters: parseResult.hasVolumeStructure
      ? parseResult.volumes.flatMap((v) => v.chapters)
      : parseResult.chapters,
    volumes: parseResult.volumes,
    hasVolumeStructure: parseResult.hasVolumeStructure,
  };
}
