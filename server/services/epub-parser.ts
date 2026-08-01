import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ParsedChapter {
  id: string;
  title: string;
  content: string;
}

export interface ParsedEpubMeta {
  title: string;
  author: string;
  publisher: string;
  description: string;
  language: string;
  isbn: string;
  coverPath: string | null;
  chapters: ParsedChapter[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTextFromHtml(html: string): string {
  // Convert <p> and <br> to newlines, strip other tags
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<[^>]*${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
}

export async function parseEpub(filePath: string, format: string, originalName?: string): Promise<ParsedEpubMeta> {
  if (format === 'txt') {
    return parseTxt(filePath, originalName);
  }

  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);

  // Read container.xml to find content.opf
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');

  const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/);
  if (!opfMatch) throw new Error('Invalid EPUB: missing content.opf');

  const opfPath = opfMatch[1];
  const opfDir = path.dirname(opfPath);
  const opfContent = await zip.file(opfPath)?.async('string');
  if (!opfContent) throw new Error('Invalid EPUB: cannot read content.opf');

  // Extract metadata
  const meta: ParsedEpubMeta = {
    title: extractTag(opfContent, 'dc:title'),
    author: extractTag(opfContent, 'dc:creator'),
    publisher: extractTag(opfContent, 'dc:publisher'),
    description: extractTag(opfContent, 'dc:description'),
    language: extractTag(opfContent, 'dc:language') || 'zh-CN',
    isbn: extractTag(opfContent, 'dc:identifier'),
    coverPath: null,
    chapters: [],
  };

  // Extract cover image
  const coverMatch = opfContent.match(/properties="cover-image"[^>]*href="([^"]+)"/)
    || opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/);
  if (coverMatch) {
    let coverHref = coverMatch[1];
    // If it's an id reference, resolve it
    if (!coverHref.includes('.')) {
      const idMatch = opfContent.match(new RegExp(`id="${coverHref}"[^>]*href="([^"]+)"`));
      if (idMatch) coverHref = idMatch[1];
    }
    const coverFullPath = opfDir ? `${opfDir}/${coverHref}` : coverHref;
    const coverFile = zip.file(coverFullPath);
    if (coverFile) {
      const coverDir = path.resolve(process.cwd(), 'uploads/covers');
      fs.mkdirSync(coverDir, { recursive: true });
      const coverFileName = `${uuidv4()}.jpg`;
      const coverData = await coverFile.async('nodebuffer');
      fs.writeFileSync(path.join(coverDir, coverFileName), coverData);
      meta.coverPath = path.join(coverDir, coverFileName);
    }
  }

  // Parse spine order
  const spineItems: string[] = [];
  const spineRegex = /<itemref\s+idref="([^"]+)"/g;
  let spineMatch;
  while ((spineMatch = spineRegex.exec(opfContent)) !== null) {
    spineItems.push(spineMatch[1]);
  }

  // Build manifest map
  const manifestMap = new Map<string, string>();
  const itemRegex = /<item\s+id="([^"]+)"[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
    manifestMap.set(itemMatch[1], itemMatch[2]);
  }

  // Extract chapters in spine order
  for (const idref of spineItems) {
    const href = manifestMap.get(idref);
    if (!href) continue;

    const fullPath = opfDir ? `${opfDir}/${href}` : href;
    const file = zip.file(fullPath);
    if (!file) continue;

    const xhtml = await file.async('string');
    const content = extractTextFromHtml(xhtml);
    if (!content.trim()) continue;

    // Try to extract title from <h1>-<h6> or <title>
    const titleMatch = xhtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
    const title = titleMatch ? stripHtml(titleMatch[1]) : path.basename(href, path.extname(href));

    meta.chapters.push({
      id: idref,
      title,
      content,
    });
  }

  return meta;
}

async function parseTxt(filePath: string, originalName?: string): Promise<ParsedEpubMeta> {
  const buffer = fs.readFileSync(filePath);

  // Detect encoding (simple UTF-8 / GBK detection)
  let text: string;
  try {
    text = buffer.toString('utf-8');
    // Check for replacement chars indicating wrong encoding
    if (text.includes('\uFFFD')) {
      const Encoding = (await import('encoding-japanese')).default;
      const unicodeArray = Encoding.convert(Array.from(buffer), { to: 'UNICODE', from: 'SJIS' });
      text = Encoding.codeToString(unicodeArray);
    }
  } catch {
    text = buffer.toString('utf-8');
  }

  // Clean text
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Use original filename or fall back to stored filename
  const baseName = originalName || path.basename(filePath, path.extname(filePath));

  return {
    title: baseName,
    author: '佚名',
    publisher: '',
    description: '',
    language: 'zh-CN',
    isbn: '',
    coverPath: null,
    chapters: [{
      id: 'chapter-1',
      title: baseName,
      content: text.trim(),
    }],
  };
}
