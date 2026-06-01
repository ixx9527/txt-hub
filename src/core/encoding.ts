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

export function detectAndDecode(buffer: ArrayBuffer): DetectResult {
  const uint8 = new Uint8Array(buffer);
  const detected = Encoding.detect(uint8) || 'UTF8';
  const encodingName = typeof detected === 'string' ? detected : 'UTF8';
  const webEncoding = ENCODING_MAP[encodingName] || 'utf-8';

  const decoder = new TextDecoder(webEncoding);
  const text = decoder.decode(uint8);

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
