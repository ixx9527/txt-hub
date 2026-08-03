import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { Chapter } from '../types';

interface Props {
  chapter: Chapter | null;
}

const LINE_HEIGHT = 28;
const BUFFER_LINES = 20;

export function ChapterPreview({ chapter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  const lines = useMemo(() => {
    if (!chapter) return [];
    return chapter.content.split('\n').filter((l) => l.trim());
  }, [chapter]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewHeight(el.clientHeight);
    setScrollTop(0);
  }, [chapter]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        选择一个章节以预览内容
      </div>
    );
  }

  const totalHeight = lines.length * LINE_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
  const endIdx = Math.min(lines.length, Math.ceil((scrollTop + viewHeight) / LINE_HEIGHT) + BUFFER_LINES);
  const visibleLines = lines.slice(startIdx, endIdx);

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center shrink-0">{chapter.title}</h2>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto relative text-sm text-gray-700 leading-7"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleLines.map((line, i) => (
            <p
              key={startIdx + i}
              className="indent-8 absolute left-0 right-0 px-0"
              style={{ top: (startIdx + i) * LINE_HEIGHT, height: LINE_HEIGHT, lineHeight: `${LINE_HEIGHT}px` }}
            >
              {line.trim()}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
