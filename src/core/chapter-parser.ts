import type { Chapter, Volume, ParseResult } from '../types';
import { chineseToNumber } from '../utils/cn-number';

const CN_NUM = '[零〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟]+';

const VOLUME_PATTERNS = [
  new RegExp(`^\\s*(?:卷|第\\s*(?:${CN_NUM}|\\d+)\\s*卷)(.*)$`),
];

const CHAPTER_PATTERNS = [
  new RegExp(`^\\s*第\\s*(${CN_NUM}|\\d+)\\s*[章节回]\\s*(.*)$`),
  /^\s*Chapter\s+(\d+)\s*[.:：]?\s*(.*)$/i,
  /^\s*(\d{1,4})\s*[.、．]\s*(.+)$/,
];

interface RawHeading {
  lineIndex: number;
  title: string;
  type: 'volume' | 'chapter';
  number: number;
}

/**
 * Detect whether a line starting with "N. xxx" is part of a sequential
 * enumerated list (e.g. 1. 2. 3. 4. 5. 紧挨着) rather than a chapter heading.
 * Returns [true, endIndex] if it's a list, so the caller can skip past it.
 */
function tryMatchSequentialList(
  lines: string[],
  idx: number,
): [boolean, number] {
  const line = lines[idx].trim();
  const m = line.match(/^(\d{1,4})\s*[.、．]\s*(.+)$/);
  if (!m) return [false, idx];

  let num = parseInt(m[1], 10);
  let end = idx;

  // Scan up to 8 following lines for strict N+1 continuation
  for (let i = idx + 1; i < Math.min(idx + 9, lines.length); i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '') break; // blank line → not a list
    const next = trimmed.match(/^(\d{1,4})\s*[.、．]\s*(.+)$/);
    if (next && parseInt(next[1], 10) === num + 1) {
      num = parseInt(next[1], 10);
      end = i;
    } else {
      break;
    }
  }

  // Need at least 3 consecutive items to consider it a list, not chapters
  const count = end - idx + 1;
  if (count >= 3) return [true, end];
  return [false, idx];
}

function parseNumber(s: string): number {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return chineseToNumber(s);
}

function matchHeading(line: string): RawHeading | null {
  for (const pat of VOLUME_PATTERNS) {
    const m = line.match(pat);
    if (m) {
      const numMatch = line.match(new RegExp(`(${CN_NUM}|\\d+)`));
      return {
        lineIndex: 0,
        title: line.trim(),
        type: 'volume',
        number: numMatch ? parseNumber(numMatch[1]) : 0,
      };
    }
  }

  for (const pat of CHAPTER_PATTERNS) {
    const m = line.match(pat);
    if (m) {
      const num = parseNumber(m[1]);
      const suffix = m[2]?.trim() || '';
      const title = suffix ? `${line.trim()}` : line.trim();
      return {
        lineIndex: 0,
        title,
        type: 'chapter',
        number: num,
      };
    }
  }

  return null;
}

export function parseChapters(text: string): ParseResult {
  const lines = text.split('\n');
  const headings: RawHeading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // If this line matches the numeric-dot pattern, apply extra validation
    // before treating it as a heading. Two kinds of false positives to skip:
    // 1. Sequential lists (1. 2. 3. 4. 5. 紧挨着)
    // 2. Fake titles like "7、0、7" where the "title" part is just another
    //    number or digit sequence, not meaningful text.
    const numericDot = line.match(/^(\d{1,4})\s*[.、．]\s*(.+)$/);
    if (numericDot) {
      // Check 1: skip sequential lists
      const [isList, lastIdx] = tryMatchSequentialList(lines, i);
      if (isList) {
        i = lastIdx;
        continue;
      }
      // Check 2: the captured "title" must contain at least one character
      // that is NOT a digit or separator (.、．)
      const titlePart = numericDot[2];
      if (!/[^\d.、．\s]/.test(titlePart)) {
        continue;
      }
    }

    const h = matchHeading(lines[i]);
    if (h) {
      h.lineIndex = i;
      headings.push(h);
    }
  }

  if (headings.length === 0) {
    const singleChapter: Chapter = {
      id: 'ch-0',
      title: '全文',
      content: text,
    };
    return { volumes: [], chapters: [singleChapter], hasVolumeStructure: false };
  }

  const hasVolumes = headings.some((h) => h.type === 'volume');

  const segments: { heading: RawHeading; content: string }[] = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].lineIndex + 1;
    const end = i + 1 < headings.length ? headings[i + 1].lineIndex : lines.length;
    segments.push({
      heading: headings[i],
      content: lines.slice(start, end).join('\n').trim(),
    });
  }

  const preambleEnd = headings[0].lineIndex;
  const preamble = lines.slice(0, preambleEnd).join('\n').trim();

  if (hasVolumes) {
    const volumes: Volume[] = [];
    let currentVolume: Volume | null = null;
    let chapterIndex = 0;

    if (preamble) {
      const introChapter: Chapter = {
        id: `ch-${chapterIndex++}`,
        title: '前言',
        content: preamble,
      };
      volumes.push({ id: 'vol-intro', title: '前言', chapters: [introChapter] });
    }

    for (const seg of segments) {
      if (seg.heading.type === 'volume') {
        currentVolume = {
          id: `vol-${volumes.length}`,
          title: seg.heading.title,
          chapters: [],
        };
        volumes.push(currentVolume);
        if (seg.content) {
          currentVolume.chapters.push({
            id: `ch-${chapterIndex++}`,
            title: seg.heading.title,
            content: seg.content,
          });
        }
      } else {
        const chapter: Chapter = {
          id: `ch-${chapterIndex++}`,
          title: seg.heading.title,
          content: seg.content,
        };
        if (currentVolume) {
          currentVolume.chapters.push(chapter);
        } else {
          if (!volumes.length || volumes[volumes.length - 1].id !== 'vol-default') {
            volumes.push({ id: 'vol-default', title: '正文', chapters: [] });
          }
          volumes[volumes.length - 1].chapters.push(chapter);
        }
      }
    }

    return { volumes, chapters: [], hasVolumeStructure: true };
  }

  const chapters: Chapter[] = [];

  if (preamble) {
    chapters.push({ id: 'ch-0', title: '前言', content: preamble });
  }

  for (const seg of segments) {
    chapters.push({
      id: `ch-${chapters.length}`,
      title: seg.heading.title,
      content: seg.content,
    });
  }

  return { volumes: [], chapters, hasVolumeStructure: false };
}
