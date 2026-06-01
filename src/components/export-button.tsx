import { useState } from 'react';
import { saveAs } from 'file-saver';
import { buildEpub } from '../core/epub-builder';
import type { BookMeta, ParseResult } from '../types';

interface Props {
  meta: BookMeta;
  result: ParseResult | null;
  coverBlob: Blob | null;
}

export function ExportButton({ meta, result, coverBlob }: Props) {
  const [exporting, setExporting] = useState(false);

  const disabled = !result || !meta.title || !meta.author || !coverBlob;

  const handleExport = async () => {
    if (!result || !coverBlob) return;
    setExporting(true);
    try {
      const blob = await buildEpub({
        meta,
        volumes: result.volumes,
        chapters: result.chapters,
        hasVolumeStructure: result.hasVolumeStructure,
        coverBlob,
      });
      saveAs(blob, `${meta.title}.epub`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      }`}
      disabled={disabled || exporting}
      onClick={handleExport}
    >
      {exporting ? '正在生成...' : '导出 EPUB'}
    </button>
  );
}
