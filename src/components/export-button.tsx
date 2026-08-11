import { useState } from 'react';
import { saveAs } from 'file-saver';
import { buildEpubInWorker } from '../core/workers';
import type { BookMeta, ParseResult } from '../types';

interface Props {
  meta: BookMeta;
  result: ParseResult | null;
  coverImage: Blob | null;
}

export function ExportButton({ meta, result, coverImage }: Props) {
  const [exporting, setExporting] = useState(false);

  const disabled = !result || !meta.title || !meta.author || !coverImage;

  const handleExport = async () => {
    if (!result || !coverImage) return;
    setExporting(true);
    try {
      const blob = await buildEpubInWorker({
        meta,
        volumes: result.volumes,
        chapters: result.chapters,
        hasVolumeStructure: result.hasVolumeStructure,
        coverImage,
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
          : 'bg-slate-600 text-white hover:bg-slate-700 active:bg-slate-800'
      }`}
      disabled={disabled || exporting}
      onClick={handleExport}
    >
      {exporting ? '正在生成...' : '导出 EPUB'}
    </button>
  );
}
