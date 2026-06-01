import type { ParseResult, Chapter, Volume } from '../types';

interface Props {
  result: ParseResult;
  selectedId: string | null;
  onSelect: (chapter: Chapter) => void;
}

export function ChapterTree({ result, selectedId, onSelect }: Props) {
  if (result.hasVolumeStructure) {
    return (
      <div className="space-y-1">
        {result.volumes.map((vol) => (
          <VolumeNode key={vol.id} volume={vol} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {result.chapters.map((ch) => (
        <ChapterItem key={ch.id} chapter={ch} selected={ch.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  );
}

function VolumeNode({
  volume,
  selectedId,
  onSelect,
}: {
  volume: Volume;
  selectedId: string | null;
  onSelect: (ch: Chapter) => void;
}) {
  return (
    <div>
      <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {volume.title}
      </div>
      <div className="ml-3 space-y-0.5">
        {volume.chapters.map((ch) => (
          <ChapterItem key={ch.id} chapter={ch} selected={ch.id === selectedId} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ChapterItem({
  chapter,
  selected,
  onSelect,
}: {
  chapter: Chapter;
  selected: boolean;
  onSelect: (ch: Chapter) => void;
}) {
  return (
    <button
      className={`w-full text-left px-2 py-1 rounded text-sm truncate transition-colors ${
        selected ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'
      }`}
      onClick={() => onSelect(chapter)}
      title={chapter.title}
    >
      {chapter.title}
    </button>
  );
}
