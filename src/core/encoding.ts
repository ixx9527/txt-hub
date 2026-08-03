import Encoding from 'encoding-japanese';

export interface DetectResult {
  encoding: string;
  text: string;
}

const ENCODING_MAP: Record<string, string> = {
  UTF8: 'utf-8',
  SJIS: 'shift-jis',
  EUCJP: 'euc-jp',
  GBK: 'gbk',
  GB18030: 'gb18030',
  GB2312: 'gbk',
  BIG5: 'big5',
  UTF16: 'utf-16le',
  UTF16BE: 'utf-16be',
  UTF16LE: 'utf-16le',
  UNICODE: 'utf-16le',
  ASCII: 'utf-8',
};

function detectBOM(uint8: Uint8Array): string | null {
  if (uint8.length >= 3 && uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
    return 'utf-8';
  }
  if (uint8.length >= 2 && uint8[0] === 0xff && uint8[1] === 0xfe) {
    return 'utf-16le';
  }
  if (uint8.length >= 2 && uint8[0] === 0xfe && uint8[1] === 0xff) {
    return 'utf-16be';
  }
  return null;
}

function tryDecode(uint8: Uint8Array, encoding: string): string | null {
  try {
    const decoder = new TextDecoder(encoding, { fatal: true });
    return decoder.decode(uint8);
  } catch {
    return null;
  }
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const CJK_PUNCT_RE = /[\u3000-\u303f\uff00-\uffef\u2018\u2019\u201c\u201d\u2014\u2026]/;

function looksLikeValidText(text: string): boolean {
  if (text.length === 0) return false;
  const sample = text.slice(0, 2000);
  let cjkCount = 0;
  let punctCount = 0;
  for (const ch of sample) {
    if (CJK_RE.test(ch)) cjkCount++;
    else if (CJK_PUNCT_RE.test(ch)) punctCount++;
  }
  const ratio = (cjkCount + punctCount) / sample.length;
  return ratio > 0.1;
}

export function detectAndDecode(buffer: ArrayBuffer): DetectResult {
  const uint8 = new Uint8Array(buffer);

  const bom = detectBOM(uint8);
  if (bom) {
    const text = new TextDecoder(bom).decode(uint8);
    const encName = bom === 'utf-8' ? 'UTF8' : bom === 'utf-16le' ? 'UTF16LE' : 'UTF16BE';
    return { encoding: encName, text };
  }

  const utf8Text = tryDecode(uint8, 'utf-8');
  if (utf8Text !== null) {
    return { encoding: 'UTF8', text: utf8Text };
  }

  const gbkText = tryDecode(uint8, 'gbk');
  if (gbkText !== null && looksLikeValidText(gbkText)) {
    return { encoding: 'GBK', text: gbkText };
  }

  const detected = Encoding.detect(uint8) || 'UTF8';
  const encodingName = typeof detected === 'string' ? detected : 'UTF8';
  const webEncoding = ENCODING_MAP[encodingName] || 'utf-8';
  const text = new TextDecoder(webEncoding).decode(uint8);
  return { encoding: encodingName, text };
}

export function decodeWithEncoding(buffer: ArrayBuffer, encoding: string): string {
  const webEncoding = ENCODING_MAP[encoding] || encoding.toLowerCase();
  const decoder = new TextDecoder(webEncoding);
  return decoder.decode(new Uint8Array(buffer));
}

export const SUPPORTED_ENCODINGS = [
  'UTF8', 'GBK', 'GB18030', 'BIG5', 'SJIS', 'EUCJP', 'UTF16', 'UTF16BE', 'UTF16LE',
] as const;
