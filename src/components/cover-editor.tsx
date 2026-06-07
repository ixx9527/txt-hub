import { useEffect, useRef, useState, useCallback } from 'react';
import { generateCover, THEMES, CoverTheme } from '../core/cover-generator';

interface Props {
  title: string;
  author: string;
  onCoverChange: (blob: Blob) => void;
}

export function CoverEditor({ title, author, onCoverChange }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<CoverTheme | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (useCustom) return;
    if (!title) return;

    let cancelled = false;
    generateCover(title, author || '佚名', selectedTheme ?? undefined).then((blob) => {
      if (cancelled) return;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      onCoverChange(blob);
    });
    return () => { cancelled = true; };
  }, [title, author, useCustom, selectedTheme, onCoverChange]);

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

  const handleThemeSelect = useCallback(
    (theme: CoverTheme | null) => {
      setUseCustom(false);
      setSelectedTheme(theme);
      setShowThemePicker(false);
    },
    [],
  );

  const currentThemeName = selectedTheme ? selectedTheme.name : '随机';

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

      {!useCustom && (
        <div className="relative">
          <button
            className="text-xs px-2 py-1 rounded border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 flex items-center gap-1"
            onClick={() => setShowThemePicker((v) => !v)}
          >
            <span>主题: {currentThemeName}</span>
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showThemePicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowThemePicker(false)} />
              <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[160px] max-h-64 overflow-y-auto">
                <button
                  className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 text-gray-700"
                  onClick={() => handleThemeSelect(null)}
                >
                  🎲 随机
                </button>
                <div className="my-1 border-t border-gray-100" />
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    className="w-full text-left text-sm px-3 py-1.5 rounded hover:bg-gray-100 flex items-center gap-2"
                    onClick={() => handleThemeSelect(theme)}
                  >
                    <span
                      className="inline-block w-4 h-4 rounded-sm border border-gray-300 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.stops[0][1]}, ${theme.stops[theme.stops.length - 1][1]})`,
                      }}
                    />
                    {theme.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
