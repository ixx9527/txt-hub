import { useState, useMemo } from 'react';
import type { ParseResult } from '../types';

interface Props {
  parseResult: ParseResult;
  onUpdateChapter: (chapterId: string, newContent: string) => void;
  onClose: () => void;
}

export function SearchReplace({ parseResult, onUpdateChapter, onClose }: Props) {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [showReplace, setShowReplace] = useState(false);

  const allChapters = useMemo(() => {
    if (parseResult.hasVolumeStructure) {
      return parseResult.volumes.flatMap((v) => v.chapters);
    }
    return parseResult.chapters;
  }, [parseResult]);

  const matchCount = useMemo(() => {
    if (!searchText) return 0;
    let count = 0;
    for (const ch of allChapters) {
      let idx = -1;
      while ((idx = ch.content.indexOf(searchText, idx + 1)) !== -1) {
        count++;
      }
    }
    return count;
  }, [searchText, allChapters]);

  const handleReplaceAll = () => {
    if (!searchText) return;
    for (const ch of allChapters) {
      if (ch.content.includes(searchText)) {
        onUpdateChapter(ch.id, ch.content.split(searchText).join(replaceText));
      }
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm shrink-0 flex-wrap">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索..."
          className="px-2 py-1 border border-gray-300 rounded text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchText && (
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {matchCount} 处匹配
          </span>
        )}
      </div>

      {showReplace && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            placeholder="替换为..."
            className="px-2 py-1 border border-gray-300 rounded text-sm w-40 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleReplaceAll}
            disabled={!searchText || matchCount === 0}
            className="px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            全部替换
          </button>
        </div>
      )}

      <button
        onClick={() => setShowReplace(!showReplace)}
        className="px-2 py-1 text-xs rounded text-gray-500 hover:bg-gray-200 whitespace-nowrap"
      >
        {showReplace ? '收起替换' : '展开替换'}
      </button>

      <button
        onClick={onClose}
        className="ml-auto p-1 text-gray-400 hover:text-gray-600"
        title="关闭"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
