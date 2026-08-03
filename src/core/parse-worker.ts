import { detectAndDecode } from './encoding';
import { trimText } from './trimmer';
import { parseChapters } from './chapter-parser';
import type { ParseResult } from '../types';

interface ParseRequest {
  buffer: ArrayBuffer;
  fileName: string;
}

export type ParseProgressStep = 'detecting' | 'trimming' | 'parsing';

interface ProgressMessage {
  type: 'progress';
  step: ParseProgressStep;
}

interface ResultMessage {
  type: 'result';
  encoding: string;
  result: ParseResult;
  fileName: string;
}

export type ParseWorkerMessage = ProgressMessage | ResultMessage;

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  const { buffer, fileName } = e.data;

  self.postMessage({ type: 'progress', step: 'detecting' } satisfies ProgressMessage);
  const { encoding, text } = detectAndDecode(buffer);

  self.postMessage({ type: 'progress', step: 'trimming' } satisfies ProgressMessage);
  const cleaned = trimText(text);

  self.postMessage({ type: 'progress', step: 'parsing' } satisfies ProgressMessage);
  const result = parseChapters(cleaned);

  self.postMessage({ type: 'result', encoding, result, fileName } satisfies ResultMessage);
};
