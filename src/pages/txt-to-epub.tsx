import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUpload } from '../components/file-upload';
import { MetadataForm } from '../components/metadata-form';
import { CoverEditor } from '../components/cover-editor';
import { ChapterTree } from '../components/chapter-tree';
import { ChapterPreview } from '../components/chapter-preview';
import { ExportButton } from '../components/export-button';
import { UploadIcon } from '../components/icons';
import { parseInWorker, buildEpubInWorker } from '../core/workers';
import type { ParseProgressStep } from '../core/parse-worker';
import { useAuth } from '../hooks/use-auth';
import { apiUpload } from '../hooks/use-api';
import type { BookMeta, Chapter, ParseResult } from '../types';

export function TxtToEpubPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [meta, setMeta] = useState<BookMeta>({
    title: '',
    author: '佚名',
    language: 'zh-CN',
  });
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [parseStep, setParseStep] = useState<ParseProgressStep | null>(null);
  const [encoding, setEncoding] = useState<string | null>(null);

  const handleFileLoaded = useCallback(async (buffer: ArrayBuffer, fileName: string) => {
    setProcessing(true);
    setParseStep(null);
    try {
      const { encoding: enc, result } = await parseInWorker(buffer, fileName, (step) => {
        setParseStep(step);
      });
      setEncoding(enc);
      setParseResult(result);

      const baseName = fileName.replace(/\.txt$/i, '');
      setMeta((prev) => ({ ...prev, title: baseName }));

      const firstChapter = result.hasVolumeStructure
        ? result.volumes[0]?.chapters[0] || null
        : result.chapters[0] || null;
      setSelectedChapter(firstChapter);
    } finally {
      setProcessing(false);
      setParseStep(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    setParseResult(null);
    setSelectedChapter(null);
    setMeta({ title: '', author: '佚名', language: 'zh-CN' });
    setCoverBlob(null);
    setEncoding(null);
  }, []);

  const handleExportAndUpload = async () => {
    if (!parseResult || !coverBlob || !token) return;
    setUploading(true);
    try {
      const blob = await buildEpubInWorker({
        meta,
        volumes: parseResult.volumes,
        chapters: parseResult.chapters,
        hasVolumeStructure: parseResult.hasVolumeStructure,
        coverBlob,
      });

      const file = new File([blob], `${meta.title}.epub`, { type: 'application/epub+zip' });
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiUpload('/books/upload', formData, token) as { id: number };
      if (result.id) {
        navigate(`/book/${result.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const chapterCount = parseResult
    ? parseResult.hasVolumeStructure
      ? parseResult.volumes.reduce((sum, v) => sum + v.chapters.length, 0)
      : parseResult.chapters.length
    : 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left sidebar */}
      <aside className="w-80 border-r border-gray-200 bg-white flex flex-col overflow-y-auto shrink-0">
        <div className="p-4 space-y-5">
          <FileUpload onFileLoaded={handleFileLoaded} onClear={handleClear} />

          {encoding && parseResult && (
            <p className="text-xs text-gray-400">
              编码: {encoding} | {chapterCount} 个章节
            </p>
          )}

          {parseResult && (
            <>
              <MetadataForm meta={meta} onChange={setMeta} />
              <CoverEditor
                title={meta.title}
                author={meta.author}
                onCoverChange={setCoverBlob}
              />
              <ExportButton meta={meta} result={parseResult} coverBlob={coverBlob} />

              {token && (
                <button
                  onClick={handleExportAndUpload}
                  disabled={uploading || !coverBlob}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <UploadIcon size={16} />
                  {uploading ? '正在上传...' : '导出并上传到书库'}
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {processing ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-10 w-10 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">
                {parseStep === 'detecting' && '正在检测编码...'}
                {parseStep === 'trimming' && '正在清洗文本...'}
                {parseStep === 'parsing' && '正在解析章节...'}
                {parseStep === null && '正在准备解析...'}
              </p>
            </div>
          </div>
        ) : parseResult ? (
          <>
            <div className="w-56 border-r border-gray-200 bg-gray-50 overflow-y-auto p-3 shrink-0">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                章节目录
              </h3>
              <ChapterTree
                result={parseResult}
                selectedId={selectedChapter?.id || null}
                onSelect={setSelectedChapter}
              />
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              <ChapterPreview chapter={selectedChapter} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <UploadIcon size={48} />
              <p className="mt-4">上传 TXT 文件开始转换</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
