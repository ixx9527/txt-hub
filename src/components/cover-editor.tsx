import { useEffect, useRef, useState, useCallback } from 'react';
import { generateCover } from '../core/cover-generator';

interface Props {
  title: string;
  author: string;
  onCoverChange: (blob: Blob) => void;
}

export function CoverEditor({ title, author, onCoverChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useCustom) return;
    if (!title) return;

    let cancelled = false;
    generateCover(title, author || '佚名').then((blob) => {
      if (cancelled) return;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      onCoverChange(blob);
    });
    return () => { cancelled = true; };
  }, [title, author, useCustom, onCoverChange]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUseCustom(true);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      onCoverChange(file);
    },
    [onCoverChange],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">封面</h3>
        <div className="flex gap-2">
          <button
            className={`text-xs px-2 py-0.5 rounded ${!useCustom ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setUseCustom(false)}
          >
            自动生成
          </button>
          <button
            className={`text-xs px-2 py-0.5 rounded ${useCustom ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => inputRef.current?.click()}
          >
            上传图片
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {previewUrl && (
        <div className="flex justify-center">
          <img
            src={previewUrl}
            alt="封面预览"
            className="max-h-64 rounded shadow-sm border border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
