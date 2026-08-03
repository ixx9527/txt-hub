import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type { ParseResult, Chapter, Volume } from '../types';

interface Props {
  result: ParseResult;
  selectedId: string | null;
  onSelect: (chapter: Chapter) => void;
}

const ITEM_HEIGHT = 32;
const VOLUME_HEADER_HEIGHT = 28;
const BUFFER_ITEMS = 10;

interface FlatItem {
  type: 'volume' | 'chapter';
  height: number;
  volume?: Volume;
  chapter?: Chapter;
  selected?: boolean;
}

function buildFlatItems(result: ParseResult, selectedId: string | null): FlatItem[] {
  const items: FlatItem[] = [];
  if (result.hasVolumeStructure) {
    for (const vol of result.volumes) {
      items.push({ type: 'volume', height: VOLUME_HEADER_HEIGHT, volume: vol });
      for (const ch of vol.chapters) {
        items.push({ type: 'chapter', height: ITEM_HEIGHT, chapter: ch, selected: ch.id === selectedId });
      }
    }
  } else {
    for (const ch of result.chapters) {
      items.push({ type: 'chapter', height: ITEM_HEIGHT, chapter: ch, selected: ch.id === selectedId });
    }
  }
  return items;
}

function computeOffset(items: FlatItem[], index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i++) offset += items[i].height;
  return offset;
}

export function ChapterTree({ result, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);

  const items = useMemo(() => buildFlatItems(result, selectedId), [result, selectedId]);
  const totalHeight = useMemo(() => items.reduce((s, it) => s + it.height, 0), [items]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setViewHeight(el.clientHeight);
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { startIdx, endIdx } = useMemo(() => {
    let acc = 0;
    let start = 0;
    for (let i = 0; i < items.length; i++) {
      if (acc + items[i].height > scrollTop) { start = i; break; }
      acc += items[i].height;
    }
    start = Math.max(0, start - BUFFER_ITEMS);
    let end = start;
    let endAcc = computeOffset(items, start);
    const limit = scrollTop + viewHeight;
    while (end < items.length && endAcc < limit) {
      endAcc += items[end].height;
      end++;
    }
    end = Math.min(items.length, end + BUFFER_ITEMS);
    return { startIdx: start, endIdx: end };
  }, [items, scrollTop, viewHeight]);

  const visibleItems = items.slice(startIdx, endIdx);
  const topOffset = computeOffset(items, startIdx);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="overflow-auto relative"
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const top = topOffset + visibleItems.slice(0, i).reduce((s, it) => s + it.height, 0);
          if (item.type === 'volume') {
            return (
              <div
                key={item.volume!.id}
                className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider absolute left-0 right-0 flex items-center"
                style={{ top, height: item.height }}
              >
                {item.volume!.title}
              </div>
            );
          }
          const ch = item.chapter!;
          return (
            <button
              key={ch.id}
              className={`w-full text-left px-2 rounded text-sm truncate transition-colors absolute left-0 right-0 flex items-center ${
                item.selected ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
              style={{ top, height: item.height }}
              onClick={() => onSelect(ch)}
              title={ch.title}
            >
              {ch.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
