import type { ParseResult } from '../types';
import type { ParseWorkerMessage, ParseProgressStep } from './parse-worker';

export interface ParseResponse {
  encoding: string;
  result: ParseResult;
  fileName: string;
}

export function parseInWorker(
  buffer: ArrayBuffer,
  fileName: string,
  onProgress?: (step: ParseProgressStep) => void,
): Promise<ParseResponse> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./parse-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<ParseWorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        onProgress?.(msg.step);
      } else {
        resolve({ encoding: msg.encoding, result: msg.result, fileName: msg.fileName });
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.postMessage({ buffer, fileName }, [buffer]);
  });
}

export function buildEpubInWorker(input: {
  meta: import('../types').BookMeta;
  volumes: import('../types').Volume[];
  chapters: import('../types').Chapter[];
  hasVolumeStructure: boolean;
  coverImage: Blob;
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./epub-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent<Blob>) => {
      resolve(e.data);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(e);
      worker.terminate();
    };
    worker.postMessage(input);
  });
}
