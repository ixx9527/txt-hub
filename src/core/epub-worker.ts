import { buildEpub } from './epub-builder';
import type { BookMeta, Chapter, Volume } from '../types';

interface EpubRequest {
  meta: BookMeta;
  volumes: Volume[];
  chapters: Chapter[];
  hasVolumeStructure: boolean;
  coverBlob: Blob;
}

self.onmessage = async (e: MessageEvent<EpubRequest>) => {
  const blob = await buildEpub(e.data);
  self.postMessage(blob);
};
