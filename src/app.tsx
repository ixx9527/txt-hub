import { useState, useCallback } from 'react';
import { FileUpload } from './components/file-upload';
import { MetadataForm } from './components/metadata-form';
import { CoverEditor } from './components/cover-editor';
import { ChapterTree } from './components/chapter-tree';
import { ChapterPreview } from './components/chapter-preview';
import { ExportButton } from './components/export-button';
import { detectAndDecode } from './core/encoding';
import { trimText } from './core/trimmer';
import { parseChapters } from './core/chapter-parser';
import type { BookMeta, Chapter, ParseResult } from './types';

export default function App() {
  const [encoding, setEncoding] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [meta, setMeta] = useState<BookMeta>({
    title: '',
    author: '佚名',
    language: 'zh-CN',
  });
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  const handleFileLoaded = useCallback((buffer: ArrayBuffer, fileName: string) => {
    const { encoding: enc, text } = detectAndDecode(buffer);
    setEncoding(enc);
    const cleaned = trimText(text);
    const result = parseChapters(cleaned);
    setParseResult(result);

    const baseName = fileName.replace(/\.txt$/i, '');
    setMeta((prev) => ({ ...prev, title: baseName }));

    const firstChapter = result.hasVolumeStructure
      ? result.volumes[0]?.chapters[0] || null
      : result.chapters[0] || null;
    setSelectedChapter(firstChapter);
  }, []);

  const chapterCount = parseResult
    ? parseResult.hasVolumeStructure
      ? parseResult.volumes.reduce((sum, v) => sum + v.chapters.length, 0)
      : parseResult.chapters.length
    : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">TXT Hub</h1>
        {encoding && (
          <span className="text-xs text-gray-400">
            编码: {encoding} | {chapterCount} 个章节
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左栏 */}
        <aside className="w-80 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 space-y-5">
            <FileUpload onFileLoaded={handleFileLoaded} />

            {parseResult && (
              <>
                <MetadataForm meta={meta} onChange={setMeta} />
                <CoverEditor
                  title={meta.title}
                  author={meta.author}
                  onCoverChange={setCoverBlob}
                />
                <ExportButton meta={meta} result={parseResult} coverBlob={coverBlob} />
              </>
            )}
          </div>
        </aside>

        {/* 右栏 */}
        <main className="flex-1 flex overflow-hidden">
          {parseResult ? (
            <>
              {/* 章节目录 */}
              <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  章节目录
                </h3>
                <ChapterTree
                  result={parseResult}
                  selectedId={selectedChapter?.id || null}
                  onSelect={setSelectedChapter}
                />
              </div>
              {/* 内容预览 */}
              <div className="flex-1 overflow-y-auto bg-white">
                <ChapterPreview chapter={selectedChapter} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-5xl mb-4">&#128214;</p>
                <p>上传 TXT 文件开始转换</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
