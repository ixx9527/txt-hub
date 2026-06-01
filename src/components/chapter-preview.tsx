import type { Chapter } from '../types';

interface Props {
  chapter: Chapter | null;
}

export function ChapterPreview({ chapter }: Props) {
  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        选择一个章节以预览内容
      </div>
    );
  }

  return (
    <div className="p-4 overflow-auto h-full">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">{chapter.title}</h2>
      <div className="space-y-2 text-sm text-gray-700 leading-7">
        {chapter.content.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          return (
            <p key={i} className="indent-8">
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
