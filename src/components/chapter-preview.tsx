import { useMemo } from 'react';
import type { Chapter } from '../types';

interface Props {
  chapter: Chapter | null;
}

export function ChapterPreview({ chapter }: Props) {
  const lines = useMemo(() => {
    if (!chapter) return [];
    return chapter.content.split('\n').filter((l) => l.trim());
  }, [chapter]);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        选择一个章节以预览内容
      </div>
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center shrink-0">{chapter.title}</h2>
      <div className="flex-1 overflow-auto text-sm text-gray-700 leading-7">
        {lines.map((line, i) => (
          <p key={i} className="indent-8">
            {line.trim()}
          </p>
        ))}
      </div>
    </div>
  );
}
